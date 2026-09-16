import type { CommerceRepository } from '../codigo/repositorios/contratos';
import {
  DomainError,
  getVariant,
  type Payment,
  type PaymentMethod,
  type Order,
} from '../codigo/modelos/dominio';
import { requireCustomer } from '../codigo/servicios/servicio-autenticacion';
import {
  OrderService,
  type PaymentService,
} from '../codigo/servicios/servicio-pedidos';
import type { PayPalProvider } from './paypal';
export class PendingPayPal implements PaymentService {
  constructor(private penPerUsd: number) {}
  confirm(method: PaymentMethod, context: { amount: number }): Payment {
    if (method !== 'PayPal')
      throw new DomainError(
        'Selecciona un proveedor para habilitar tarjeta y Yape.',
        'unavailable',
      );
    if (!Number.isFinite(this.penPerUsd) || this.penPerUsd <= 0)
      throw new DomainError(
        'Falta definir la conversión de soles a dólares para PayPal.',
        'unavailable',
      );
    const amount = Math.round(context.amount / this.penPerUsd);
    if (!Number.isSafeInteger(amount) || amount <= 0)
      throw new DomainError('Importe de pago inválido.');
    return {
      method,
      status: 'PENDING',
      reference: '',
      currency: 'USD',
      amount,
    };
  }
}
export class PaymentCoordinator {
  constructor(
    private repository: CommerceRepository,
    private provider: PayPalProvider,
    private rate: number,
  ) {}
  async checkout(input: unknown) {
    const order = await new OrderService(
      this.repository,
      new PendingPayPal(this.rate),
    ).checkout(input);
    return this.start(order.id);
  }
  async start(id: string) {
    const order = await new OrderService(
      this.repository,
      new PendingPayPal(this.rate),
    ).detail(id);
    if (order.status !== 'PENDIENTE' || order.payment.approvalUrl) return order;
    if ((order.expiresAt || 0) < Date.now())
      throw new DomainError(
        'La reserva ha vencido. Cancela el pedido para liberar la selección.',
        'payment',
      );
    const remote = await this.provider.create(
      order.id,
      order.payment.amount!,
      order.payment.currency!,
    );
    return this.repository.transaction((s) => {
      const user = requireCustomer(s);
      const o = s.orders.find((x) => x.id === id && x.userId === user.id);
      if (!o) throw new DomainError('Pedido no disponible.');
      if (o.status === 'PENDIENTE') Object.assign(o.payment, remote);
      return o;
    });
  }
  async capture(id: string) {
    const order = await new OrderService(
      this.repository,
      new PendingPayPal(this.rate),
    ).detail(id);
    if (order.status === 'PAGADO') return order;
    if (order.status !== 'PENDIENTE' || !order.payment.reference)
      throw new DomainError('No hay un pago pendiente para confirmar.');
    if ((order.expiresAt || 0) < Date.now())
      throw new DomainError('La reserva ha vencido.', 'payment');
    const response = await this.provider.capture(
      order.payment.reference,
      order.id + '-capture',
    );
    return this.reconcile(order, response);
  }
  async reconcile(
    order: Order,
    response: Awaited<ReturnType<PayPalProvider['details']>>,
  ) {
    const units = response.purchase_units || [];
    const capture = units[0]?.payments?.captures?.[0];
    if (response.status !== 'COMPLETED' || capture?.status !== 'COMPLETED')
      return order;
    return this.repository.transaction((s) => {
      const o = s.orders.find((x) => x.id === order.id);
      if (!o) throw new DomainError('Pedido no disponible.');
      if (o.status === 'PAGADO') return o;
      if (
        o.status !== 'PENDIENTE' ||
        units.length !== 1 ||
        units[0].payments?.captures.length !== 1 ||
        units[0].custom_id !== o.id ||
        response.id !== o.payment.reference ||
        Math.round(Number(capture.amount.value) * 100) !== o.payment.amount ||
        capture.amount.currency_code !== o.payment.currency
      ) {
        o.status = 'REVISION';
        o.payment.status = 'REVIEW';
        o.payment.captureId = capture.id;
        return o;
      }
      for (const item of o.items) {
        const { variant } = getVariant(s.products, item.variantId);
        if (
          variant.inventory.reserved < item.quantity ||
          variant.inventory.stock < item.quantity
        )
          throw new DomainError('Inventario en revisión.', 'stock');
        variant.inventory.reserved -= item.quantity;
        variant.inventory.stock -= item.quantity;
      }
      o.status = 'PAGADO';
      o.payment.status = 'PAID';
      o.payment.captureId = capture.id;
      return o;
    });
  }
  async cancel(id: string) {
    return this.repository.transaction((s) => {
      const u = requireCustomer(s);
      const o = s.orders.find((x) => x.id === id && x.userId === u.id);
      if (!o) throw new DomainError('Pedido no disponible.');
      if (o.status !== 'PENDIENTE')
        throw new DomainError('Este pedido no se puede cancelar.');
      // CAPTURE is server-controlled. A capture racing cancellation is reconciled as REVIEW.
      for (const item of o.items)
        getVariant(s.products, item.variantId).variant.inventory.reserved -=
          item.quantity;
      o.status = 'CANCELADO';
      o.payment.status = 'CANCELLED';
      return o;
    });
  }
  async expire() {
    return this.repository.transaction((s) => {
      let count = 0;
      for (const o of s.orders)
        if (
          o.status === 'PENDIENTE' &&
          (o.expiresAt || Infinity) < Date.now()
        ) {
          for (const item of o.items)
            getVariant(s.products, item.variantId).variant.inventory.reserved -=
              item.quantity;
          o.status = 'CANCELADO';
          o.payment.status = 'CANCELLED';
          count++;
        }
      return count;
    });
  }
}
