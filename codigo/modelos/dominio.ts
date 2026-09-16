import { z } from "zod";
z.config({
  customError: () => "Revisa los datos: falta un campo o su valor no es válido.",
});
export interface Category {
  id: string;
  name: string;
  image: string;
}
export interface Brand {
  id: string;
  name: string;
}
export interface Inventory {
  stock: number;
  reserved: number;
}
export interface Variant {
  id: string;
  name: string;
  color: string;
  price: number;
  previousPrice?: number;
  inventory: Inventory;
}
export interface Review {
  id: string;
  productId: string;
  name: string;
  rating: number;
  comment: string;
  demo: boolean;
}
export interface Product {
  id: string;
  name: string;
  categoryId: string;
  brand: Brand;
  material: string;
  description: string;
  images: string[];
  atlas?: number;
  tag: string;
  variants: Variant[];
  reviews: Review[];
  specifications: Record<string, string>;
}
export interface RoomProduct {
  id: string;
  productId: string;
  variantId?: string;
  positionX: number;
  positionY: number;
  isActive: boolean;
  sortOrder: number;
  tooltipPosition?: "top" | "right" | "bottom" | "left";
}
export interface Room {
  id: string;
  name: string;
  slug: string;
  image: string;
  imageMobile?: string;
  title: string;
  subtitle: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  products: RoomProduct[];
}
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
}
export interface Address {
  id: string;
  name: string;
  street: string;
  department: string;
  city: string;
  district: string;
  reference: string;
}
export interface Customer extends User {
  addresses: Address[];
}
export interface CartItem {
  variantId: string;
  quantity: number;
}
export interface Cart {
  items: CartItem[];
  coupon: string;
}
export interface Favorite {
  productId: string;
}
export interface Coupon {
  code: string;
  percent: number;
  minSubtotal: number;
}
export type PaymentMethod = "PayPal" | "Tarjeta" | "Yape";
export interface Payment {
  method: PaymentMethod;
  status: "SIMULATED" | "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REVIEW" | "REFUNDED";
  reference: string;
  approvalUrl?: string;
  amount?: number;
  currency?: string;
  captureId?: string;
}
export interface OrderItem {
  variantId: string;
  productId: string;
  name: string;
  variant: string;
  price: number;
  quantity: number;
  image: string;
  atlas?: number;
}
export interface Totals {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}
export interface Order {
  id: string;
  key: string;
  userId: string;
  createdAt: string;
  items: OrderItem[];
  totals: Totals;
  address: Address;
  email: string;
  payment: Payment;
  status: "CONFIRMADO_DEMO" | "PENDIENTE" | "PAGADO" | "CANCELADO" | "REVISION" | "REEMBOLSADO";
  fingerprint: string;
  expiresAt?: number;
}
export interface Query {
  q: string;
  category: string;
  brand: string;
  min?: number;
  max?: number;
  available: boolean;
  sort: "selection" | "name" | "price-asc" | "price-desc";
  page: number;
  pageSize: number;
  newOnly: boolean;
}
export const defaultQuery: Query = {
  q: "",
  category: "",
  brand: "",
  available: false,
  sort: "selection",
  page: 1,
  pageSize: 6,
  newOnly: false,
};
export class DomainError extends Error {
  constructor(
    message: string,
    public code = "validation",
  ) {
    super(message);
  }
}
export const emailSchema = z
  .email("Escribe un correo válido.")
  .max(200)
  .transform((s) => s.toLowerCase().trim());
export const registerSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre completo.").max(100),
  email: emailSchema,
  password: z.string().min(10, "Usa al menos 10 caracteres.").max(128),
  consent: z.literal(true, {
    error: "Debes aceptar la política de privacidad.",
  }),
});
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Escribe tu contraseña.").max(128),
});
export const profileSchema = z.object({
  name: z.string().trim().min(2, "Indica tu nombre.").max(100),
  email: emailSchema,
  phone: z.string().regex(/^[+\d ()-]{7,20}$/, "Escribe un teléfono válido."),
});
export const addressSchema = z.object({
  id: z.string().default(""),
  name: z.string().trim().min(2, "Indica un nombre para la dirección.").max(80),
  street: z.string().trim().min(5, "Completa la dirección.").max(200),
  department: z.string().trim().min(2, "Indica el departamento.").max(80),
  city: z.string().trim().min(2, "Indica la provincia.").max(80),
  district: z.string().trim().min(2, "Indica el distrito.").max(80),
  reference: z.string().trim().max(200).default(""),
});
export const checkoutSchema = z.object({
  key: z.uuid(),
  address: addressSchema,
  email: emailSchema,
  method: z.enum(["PayPal", "Tarjeta", "Yape"]),
  consent: z.literal(true, {
    error: "Acepta las condiciones antes de continuar.",
  }),
});
export const quantitySchema = z
  .number()
  .int("La cantidad debe ser entera.")
  .min(1, "La cantidad mínima es 1.")
  .max(20, "Máximo 20 unidades por variante.");
export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
export function available(v: Variant) {
  return Math.max(0, v.inventory.stock - v.inventory.reserved);
}
export function getVariant(products: Product[], id: string) {
  for (const p of products) {
    const variant = p.variants.find((v) => v.id === id);
    if (variant) return { product: p, variant };
  }
  throw new DomainError("Este producto ya no está disponible.", "not-found");
}
export function validateItems(products: Product[], items: CartItem[]) {
  const seen = new Set<string>();
  for (const i of items) {
    quantitySchema.parse(i.quantity);
    if (seen.has(i.variantId)) throw new DomainError("La variante está duplicada.");
    seen.add(i.variantId);
    const { variant } = getVariant(products, i.variantId);
    if (i.quantity > available(variant))
      throw new DomainError("No hay suficientes unidades disponibles.", "stock");
  }
}
export function calculateTotals(products: Product[], cart: Cart, coupons: Coupon[]): Totals {
  validateItems(products, cart.items);
  const subtotal = cart.items.reduce(
    (sum, i) => sum + getVariant(products, i.variantId).variant.price * i.quantity,
    0,
  );
  const coupon = cart.coupon ? coupons.find((c) => c.code === cart.coupon) : undefined;
  if (cart.coupon && (!coupon || subtotal < coupon.minSubtotal))
    throw new DomainError("Cupón inválido o compra mínima no alcanzada.", "coupon");
  const discount = coupon ? Math.round((subtotal * coupon.percent) / 100) : 0;
  // Reglas solo de fixture: no representan condiciones comerciales de NexaTech.
  const shipping = subtotal === 0 || subtotal >= 35000 ? 0 : 1500;
  return {
    subtotal,
    discount,
    shipping,
    total: subtotal - discount + shipping,
  };
}
export function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) return error.issues[0]?.message || "Revisa los datos.";
  return error instanceof Error ? error.message : "No se pudo completar la operación.";
}
