import type { Cart, Customer, Order, Product, Coupon, Room } from "../modelos/dominio";
export interface State {
  products: Product[];
  rooms: Room[];
  coupons: Coupon[];
  users: Customer[];
  credentials: Record<string, { salt: string; hash: string }>;
  session: string | null;
  guestKey?: string;
  carts: Record<string, Cart>;
  favorites: Record<string, string[]>;
  orders: Order[];
  resets: Record<string, { userId: string; expires: number }>;
  subscriptions: string[];
}
// Contrato transaccional para el adaptador demo. La implementación PostgreSQL futura
// debe ejecutar autorización, reglas y transacciones en el servidor, nunca en la View.
export interface CommerceRepository {
  read(): Promise<State>;
  transaction<T>(action: (state: State) => T | Promise<T>): Promise<T>;
}
