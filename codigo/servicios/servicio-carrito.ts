import type { CommerceRepository, State } from '../repositorios/contratos';
import {
  calculateTotals,
  getVariant,
  validateItems,
  type Cart,
} from '../modelos/dominio';
export const actorKey = (s: State) => s.session || s.guestKey || 'guest';
export function currentCart(s: State): Cart {
  return s.carts[actorKey(s)] ?? { items: [], coupon: '' };
}
export class CartService {
  constructor(private repository: CommerceRepository) {}
  async change(variantId: string, quantity: number, increment = false) {
    return this.repository.transaction((s) => {
      getVariant(s.products, variantId);
      const key = actorKey(s),
        cart = currentCart(s);
      const existing = cart.items.find((i) => i.variantId === variantId);
      const next = increment ? (existing?.quantity || 0) + quantity : quantity;
      const items = cart.items.filter((i) => i.variantId !== variantId);
      if (next !== 0) items.push({ variantId, quantity: next });
      validateItems(s.products, items);
      let coupon = cart.coupon;
      try {
        calculateTotals(s.products, { items, coupon }, s.coupons);
      } catch {
        coupon = '';
      }
      s.carts[key] = { items, coupon };
      return s.carts[key];
    });
  }
  async coupon(code: string) {
    return this.repository.transaction((s) => {
      const cart = { ...currentCart(s), coupon: code.trim().toUpperCase() };
      calculateTotals(s.products, cart, s.coupons);
      s.carts[actorKey(s)] = cart;
    });
  }
  async favorite(productId: string) {
    return this.repository.transaction((s) => {
      if (!s.products.some((p) => p.id === productId))
        throw new Error('Producto desconocido.');
      const key = actorKey(s),
        f = s.favorites[key] || [];
      s.favorites[key] = f.includes(productId)
        ? f.filter((x) => x !== productId)
        : [...f, productId];
    });
  }
}
