import { z } from 'zod';
import type { ShopController } from '../codigo/controladores/controlador-tienda';
import { DomainError } from '../codigo/modelos/dominio';
import type { MailActions } from './acciones-correo';
const id = z.string().min(1).max(120);
const query = z.object({
  q: z.string().max(200).optional(),
  category: id.optional().or(z.literal('')),
  brand: id.optional().or(z.literal('')),
  min: z.number().min(0).max(1e7).optional(),
  max: z.number().min(0).max(1e7).optional(),
  available: z.boolean().optional(),
  newOnly: z.boolean().optional(),
  sort: z.enum(['selection', 'name', 'price-asc', 'price-desc']).optional(),
  page: z.number().int().min(1).max(10000).optional(),
  pageSize: z.number().int().min(1).max(24).optional(),
});
export async function dispatch(
  shop: ShopController,
  action: string,
  input: unknown,
  demo: boolean,
  mail?: MailActions,
) {
  const args = z
    .object({ args: z.array(z.unknown()).max(3) })
    .strict()
    .parse(input).args;
  switch (action) {
    case 'snapshot':
      return shop.snapshot();
    case 'products.list':
      return shop.products.list(query.parse(args[0] || {}));
    case 'products.detail':
      return shop.products.detail(id.parse(args[0]));
    case 'auth.register':
      return shop.auth.register(args[0]);
    case 'auth.login':
      return shop.auth.login(args[0]);
    case 'auth.logout':
      return shop.auth.logout();
    case 'auth.profile':
      return shop.auth.profile(args[0]);
    case 'auth.address':
      return shop.auth.address(args[0]);
    case 'auth.removeAddress':
      return shop.auth.removeAddress(id.parse(args[0]));
    case 'auth.recover':
      if (mail) return mail.recover(z.string().max(200).parse(args[0]));
      if (!demo)
        throw new DomainError(
          'Recuperación por correo pendiente de configuración.',
          'unavailable',
        );
      return shop.auth.recover(z.string().max(200).parse(args[0]));
    case 'auth.reset':
      if (!demo && !mail)
        throw new DomainError(
          'Recuperación por correo pendiente de configuración.',
          'unavailable',
        );
      return shop.auth.reset(
        z.uuid().parse(args[0]),
        z.string().min(10).max(128).parse(args[1]),
      );
    case 'cart.change':
      return shop.cart.change(
        id.parse(args[0]),
        z.number().int().min(0).max(20).parse(args[1]),
        z.boolean().default(false).parse(args[2]),
      );
    case 'cart.coupon':
      return shop.cart.coupon(z.string().max(80).parse(args[0]));
    case 'cart.favorite':
      return shop.cart.favorite(id.parse(args[0]));
    case 'orders.list':
      return shop.orders.list();
    case 'orders.detail':
      return shop.orders.detail(id.parse(args[0]));
    case 'orders.checkout':
      if (!demo)
        throw new DomainError(
          'Los pagos aún no están habilitados. No se ha creado un pedido ni realizado un cobro.',
          'unavailable',
        );
      {
        const order = await shop.orders.checkout(args[0]);
        if (mail) await mail.order(order.id);
        return order;
      }
    case 'email.subscribe':
      if (mail)
        return mail.subscribe(
          z.string().max(200).parse(args[0]),
          z.boolean().parse(args[1]),
        );
      if (!demo)
        throw new DomainError(
          'La comunidad estará disponible próximamente.',
          'unavailable',
        );
      return shop.email.subscribe(
        z.string().max(200).parse(args[0]),
        z.boolean().parse(args[1]),
      );
    default:
      throw new DomainError('Acción no disponible.', 'not-found');
  }
}
