import type { CommerceRepository } from '../repositorios/contratos';
import {
  calculateTotals,
  checkoutSchema,
  DomainError,
  getVariant,
  type Payment,
  type PaymentMethod,
} from '../modelos/dominio';
import { requireCustomer } from './servicio-autenticacion';
import { currentCart } from './servicio-carrito';
export interface PaymentService {
  confirm(
    method: PaymentMethod,
    context: {
      amount: number;
      currency: 'PEN';
      idempotencyKey: string;
      userId: string;
    },
  ): Payment;
}
export class UnconfiguredPaymentService implements PaymentService {
  confirm(): Payment {
    throw new DomainError(
      'La pasarela de pago está pendiente de configuración.',
      'unavailable',
    );
  }
}
export class DemoPaymentService implements PaymentService {
  confirm(method: PaymentMethod): Payment {
    return {
      method,
      status: 'SIMULATED',
      reference: 'DEMO-' + crypto.randomUUID(),
    };
  }
}
export class OrderService {
  constructor(
    private repository: CommerceRepository,
    private payment: PaymentService,
  ) {}
  async checkout(input: unknown) {
    const d = checkoutSchema.parse(input);
    return this.repository.transaction((s) => {
      const user = requireCustomer(s);
      const fingerprint = JSON.stringify({
        address: d.address,
        email: d.email,
        method: d.method,
      });
      const existing = s.orders.find(
        (o) => o.key === d.key && o.userId === user.id,
      );
      if (existing) {
        if (existing.fingerprint !== fingerprint)
          throw new DomainError('La solicitud ya se utilizó con otros datos.');
        return existing;
      }
      const cart = currentCart(s);
      if (!cart.items.length)
        throw new DomainError('Agrega productos antes de confirmar.');
      const totals = calculateTotals(s.products, cart, s.coupons);
      const payment = this.payment.confirm(d.method, {
        amount: totals.total,
        currency: 'PEN',
        idempotencyKey: d.key,
        userId: user.id,
      });
      const items = cart.items.map((item) => {
        const { product: p, variant: v } = getVariant(
          s.products,
          item.variantId,
        );
        if (payment.status === 'PENDING') v.inventory.reserved += item.quantity;
        else v.inventory.stock -= item.quantity;
        return {
          ...item,
          productId: p.id,
          name: p.name,
          variant: v.name,
          price: v.price,
          image: p.images[0],
          atlas: p.atlas,
        };
      });
      const order = {
        id: crypto.randomUUID(),
        key: d.key,
        userId: user.id,
        createdAt: new Date().toISOString(),
        items,
        totals,
        address: d.address,
        email: d.email,
        payment,
        status:
          payment.status === 'PENDING'
            ? ('PENDIENTE' as const)
            : ('CONFIRMADO_DEMO' as const),
        ...(payment.status === 'PENDING'
          ? { expiresAt: Date.now() + 30 * 60 * 1000 }
          : {}),
        fingerprint,
      };
      s.orders.push(order);
      s.carts[user.id] = { items: [], coupon: '' };
      return order;
    });
  }
  async list() {
    const s = await this.repository.read(),
      user = requireCustomer(s);
    return s.orders.filter((o) => o.userId === user.id).reverse();
  }
  async detail(id: string) {
    const s = await this.repository.read(),
      user = requireCustomer(s);
    const order = s.orders.find((o) => o.id === id && o.userId === user.id);
    if (!order)
      throw new DomainError(
        'No encontramos ese pedido en tu cuenta.',
        'not-found',
      );
    return order;
  }
}
