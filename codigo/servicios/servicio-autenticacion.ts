import type { CommerceRepository, State } from '../repositorios/contratos';
import {
  addressSchema,
  available,
  DomainError,
  emailSchema,
  getVariant,
  loginSchema,
  profileSchema,
  registerSchema,
  type Customer,
} from '../modelos/dominio';
export function requireCustomer(s: State): Customer {
  const user = s.users.find((u) => u.id === s.session);
  if (!user)
    throw new DomainError('Inicia sesión para continuar.', 'unauthorized');
  return user;
}
const hex = (b: ArrayBuffer) =>
  Array.from(new Uint8Array(b), (n) => n.toString(16).padStart(2, '0')).join(
    '',
  );
async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  return hex(
    await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode(salt),
        iterations: 600000,
        hash: 'SHA-256',
      },
      key,
      256,
    ),
  );
}
function enter(s: State, id: string) {
  const guestKey = s.guestKey || 'guest';
  const guest = s.carts[guestKey]?.items || [];
  const cart = s.carts[id] || { items: [], coupon: '' };
  cart.coupon ||= s.carts[guestKey]?.coupon || '';
  for (const item of guest) {
    const existing = cart.items.find((i) => i.variantId === item.variantId);
    const { variant } = getVariant(s.products, item.variantId);
    const quantity = Math.min(
      20,
      available(variant),
      (existing?.quantity || 0) + item.quantity,
    );
    if (existing) existing.quantity = quantity;
    else if (quantity > 0) cart.items.push({ ...item, quantity });
  }
  cart.items = cart.items.filter((i) => i.quantity > 0);
  s.carts[id] = cart;
  s.favorites[id] = [
    ...new Set([...(s.favorites[id] || []), ...(s.favorites[guestKey] || [])]),
  ];
  delete s.carts[guestKey];
  delete s.favorites[guestKey];
  s.session = id;
}
export class AuthService {
  constructor(private repository: CommerceRepository) {}
  async register(input: unknown) {
    const d = registerSchema.parse(input);
    const salt = crypto.randomUUID(),
      hash = await passwordHash(d.password, salt);
    return this.repository.transaction((s) => {
      if (s.users.some((u) => u.email === d.email))
        throw new DomainError('Ya existe una cuenta con este correo.');
      const user = {
        id: crypto.randomUUID(),
        name: d.name,
        email: d.email,
        phone: '',
        addresses: [],
      };
      s.users.push(user);
      s.credentials[user.id] = { salt, hash };
      enter(s, user.id);
      return user;
    });
  }
  async login(input: unknown) {
    const d = loginSchema.parse(input);
    const snapshot = await this.repository.read();
    const candidate = snapshot.users.find((u) => u.email === d.email);
    const credential = candidate
      ? snapshot.credentials[candidate.id]
      : undefined;
    // Do the expensive hash outside the write transaction, also for unknown accounts.
    const hash = await passwordHash(
      d.password,
      credential?.salt || 'unknown-account-padding',
    );
    return this.repository.transaction((s) => {
      const user = s.users.find(
        (u) => u.id === candidate?.id && u.email === d.email,
      );
      if (
        !user ||
        !credential ||
        hash !== credential.hash ||
        s.credentials[user.id]?.hash !== credential.hash
      )
        throw new DomainError('Correo o contraseña incorrectos.');
      enter(s, user.id);
      return user;
    });
  }
  async logout() {
    await this.repository.transaction((s) => {
      s.session = null;
    });
  }
  async profile(input: unknown) {
    const d = profileSchema.parse(input);
    return this.repository.transaction((s) => {
      const u = requireCustomer(s);
      if (s.users.some((x) => x.id !== u.id && x.email === d.email))
        throw new DomainError('Este correo ya está registrado.');
      Object.assign(u, d);
    });
  }
  async address(input: unknown) {
    const d = addressSchema.parse(input);
    return this.repository.transaction((s) => {
      const u = requireCustomer(s);
      const address = { ...d, id: d.id || crypto.randomUUID() };
      if (d.id && !u.addresses.some((a) => a.id === d.id))
        throw new DomainError('Dirección desconocida.');
      u.addresses = [
        ...u.addresses.filter((a) => a.id !== address.id),
        address,
      ];
    });
  }
  async removeAddress(id: string) {
    return this.repository.transaction((s) => {
      const u = requireCustomer(s);
      u.addresses = u.addresses.filter((a) => a.id !== id);
    });
  }
  async recover(email: string) {
    const value = emailSchema.parse(email);
    const token = crypto.randomUUID();
    const tokenHash = hex(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)),
    );
    return this.repository.transaction((s) => {
      const user = s.users.find((u) => u.email === value);
      if (!user) return '';
      for (const [key, v] of Object.entries(s.resets))
        if (v.userId === user.id || v.expires < Date.now())
          delete s.resets[key];
      s.resets[tokenHash] = {
        userId: user.id,
        expires: Date.now() + 15 * 60 * 1000,
      };
      return token;
    });
  }
  async reset(token: string, password: string) {
    const tokenHash = hex(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)),
    );
    if (password.length < 10 || password.length > 128)
      throw new DomainError('Usa una contraseña entre 10 y 128 caracteres.');
    const salt = crypto.randomUUID(),
      hash = await passwordHash(password, salt);
    return this.repository.transaction((s) => {
      const reset = s.resets[tokenHash];
      if (!reset || reset.expires < Date.now())
        throw new DomainError('El enlace ha caducado o ya se utilizó.');
      s.credentials[reset.userId] = { salt, hash };
      for (const [key, v] of Object.entries(s.resets))
        if (v.userId === reset.userId) delete s.resets[key];
      s.session = null;
    });
  }
}
