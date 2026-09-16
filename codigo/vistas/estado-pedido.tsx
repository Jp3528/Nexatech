import {
  CheckCircle2,
  Clock3,
  CircleAlert,
  CircleX,
  RotateCcw,
} from 'lucide-react';
import type { Order, Payment } from '../modelos/dominio';
export const paymentLabels: Record<Payment['status'], string> = {
  SIMULATED: 'Registrado',
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  FAILED: 'No completado',
  CANCELLED: 'Cancelado',
  REVIEW: 'En revisión',
  REFUNDED: 'Reembolsado',
};
export const orderLabels: Record<
  Order['status'],
  { title: string; description: string }
> = {
  CONFIRMADO_DEMO: {
    title: 'Pedido confirmado',
    description: 'Hemos registrado tu pedido y generado el comprobante de compra.',
  },
  PENDIENTE: {
    title: 'Pago pendiente',
    description:
      'El pedido todavía no está confirmado. Consulta su estado antes de volver a pagar.',
  },
  PAGADO: {
    title: 'Pago confirmado',
    description:
      'El pago quedó registrado. Consulta aquí los detalles de tu pedido.',
  },
  CANCELADO: {
    title: 'Pedido cancelado',
    description: 'Este pedido no continuará su preparación.',
  },
  REVISION: {
    title: 'Pago en revisión',
    description:
      'Estamos comprobando el resultado del pago. No vuelvas a pagar este pedido mientras se revisa.',
  },
  REEMBOLSADO: {
    title: 'Pedido reembolsado',
    description:
      'Se ha registrado el reembolso. El plazo para verlo depende del medio de pago.',
  },
};
export function OrderStatus({ status }: { status: Order['status'] }) {
  const info = orderLabels[status],
    Icon =
      status === 'PENDIENTE'
        ? Clock3
        : status === 'REVISION'
          ? CircleAlert
          : status === 'CANCELADO'
            ? CircleX
            : status === 'REEMBOLSADO'
              ? RotateCcw
              : CheckCircle2;
  return (
    <output className="notice" style={{ display: 'block' }}>
      <Icon size={22} aria-hidden="true" />
      <strong> {info.title}</strong>
      <span style={{ display: 'block', marginTop: 8 }}>{info.description}</span>
    </output>
  );
}
