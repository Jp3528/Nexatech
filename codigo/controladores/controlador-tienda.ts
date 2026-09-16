import type { CommerceRepository } from "../repositorios/contratos";
import { rooms as fallbackRooms } from "../datos/datos-demo";
import {
  calculateTotals,
  getVariant,
  type Customer,
  type Product,
  type Room,
  type Cart,
  type Totals,
  type Order,
} from "../modelos/dominio";
import { AuthService } from "../servicios/servicio-autenticacion";
import { CartService, actorKey, currentCart } from "../servicios/servicio-carrito";
import { ProductService } from "../servicios/servicio-productos";
import {
  OrderService,
  DemoPaymentService,
  type PaymentService,
} from "../servicios/servicio-pedidos";
import { DemoEmailService } from "../servicios/servicio-correo";
export interface Snapshot {
  products: Product[];
  rooms: Room[];
  user: Customer | null;
  cart: Cart;
  favorites: string[];
  totals: Totals;
  orders: Order[];
  count: number;
  cartIssue: string;
}
function visibleRooms(rooms: Room[], products: Product[]) {
  const productIds = new Set(products.map((product) => product.id));
  return rooms
    .filter((room) => room.isActive)
    .map((room) => ({
      ...room,
      products: room.products
        .filter(
          (item) =>
            item.isActive &&
            productIds.has(item.productId) &&
            item.positionX >= 0 &&
            item.positionX <= 100 &&
            item.positionY >= 0 &&
            item.positionY <= 100,
        )
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .filter((room) => room.products.length)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
export class ShopController {
  readonly auth: AuthService;
  readonly cart: CartService;
  readonly products: ProductService;
  readonly orders: OrderService;
  readonly email: DemoEmailService;
  constructor(
    private repository: CommerceRepository,
    payment: PaymentService = new DemoPaymentService(),
  ) {
    this.auth = new AuthService(repository);
    this.cart = new CartService(repository);
    this.products = new ProductService(repository);
    this.orders = new OrderService(repository, payment);
    this.email = new DemoEmailService(repository);
  }
  async snapshot(): Promise<Snapshot> {
    const s = await this.repository.read();
    const cart = currentCart(s);
    let totals: Totals = { subtotal: 0, discount: 0, shipping: 0, total: 0 },
      cartIssue = "";
    try {
      totals = calculateTotals(s.products, cart, s.coupons);
    } catch (e) {
      cartIssue = e instanceof Error ? e.message : "Revisa el carrito.";
      totals.subtotal = cart.items.reduce(
        (n, i) => n + getVariant(s.products, i.variantId).variant.price * i.quantity,
        0,
      );
      totals.total = totals.subtotal;
    }
    return {
      products: s.products,
      rooms: visibleRooms(s.rooms.length ? s.rooms : fallbackRooms, s.products),
      user: s.users.find((u) => u.id === s.session) || null,
      cart,
      favorites: s.favorites[actorKey(s)] || [],
      totals,
      orders: s.orders.filter((o) => o.userId === s.session).reverse(),
      count: cart.items.reduce((n, i) => n + i.quantity, 0),
      cartIssue,
    };
  }
}
