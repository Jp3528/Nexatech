import { z } from "zod";
const id = z.string().min(1).max(200),
  money = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const localImage = /^\/recursos\/[a-zA-Z0-9_./-]+$/;
const unsplashImage = /^https:\/\/images\.unsplash\.com\/[a-zA-Z0-9_./?=&%-]+$/;
const image = z
  .string()
  .refine(
    (value) => localImage.test(value) || unsplashImage.test(value),
    'Imagen no permitida.',
  );
export const customerDto = z.object({
  id,
  name: z.string(),
  email: z.email(),
  phone: z.string(),
  addresses: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      street: z.string(),
      department: z.string(),
      city: z.string(),
      district: z.string(),
      reference: z.string(),
    }),
  ),
});
export const productDto = z.object({
  id,
  name: z.string().min(1),
  categoryId: id,
  brand: z.object({ id, name: z.string() }),
  material: z.string(),
  description: z.string(),
  images: z.array(image).min(1),
  atlas: z.number().int().min(0).max(7).optional(),
  tag: z.string(),
  variants: z
    .array(
      z.object({
        id,
        name: z.string(),
        color: z.string(),
        price: money,
        previousPrice: money.optional(),
        inventory: z.object({ stock: money, reserved: money }),
      }),
    )
    .min(1),
  reviews: z.array(
    z.object({
      id,
      productId: id,
      name: z.string(),
      rating: z.number().min(1).max(5),
      comment: z.string(),
      demo: z.boolean(),
    }),
  ),
  specifications: z.record(z.string(), z.string()),
});
export const roomProductDto = z.object({
  id,
  productId: id,
  variantId: id.optional(),
  positionX: z.number().min(0).max(100),
  positionY: z.number().min(0).max(100),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  tooltipPosition: z.enum(["top", "right", "bottom", "left"]).optional(),
});
export const roomDto = z.object({
  id,
  name: z.string().min(1),
  slug: id,
  image,
  imageMobile: image.optional(),
  title: z.string().min(1),
  subtitle: z.string(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  products: z.array(roomProductDto),
});
export const cartDto = z.object({
  items: z.array(z.object({ variantId: id, quantity: z.number().int().min(1).max(20) })),
  coupon: z.string(),
});
export const totalsDto = z.object({
  subtotal: money,
  discount: money,
  shipping: money,
  total: money,
});
export const orderDto = z.object({
  id,
  key: id,
  userId: id,
  createdAt: z.iso.datetime(),
  items: z.array(
    z.object({
      variantId: id,
      productId: id,
      name: z.string(),
      variant: z.string(),
      price: money,
      quantity: z.number().int().positive(),
      image,
      atlas: z.number().optional(),
    }),
  ),
  totals: totalsDto,
  address: customerDto.shape.addresses.element,
  email: z.email(),
  payment: z.object({
    method: z.enum(["PayPal", "Tarjeta", "Yape"]),
    status: z.enum(["SIMULATED", "PENDING", "PAID", "FAILED", "CANCELLED", "REVIEW", "REFUNDED"]),
    reference: z.string(),
    approvalUrl: z.url().optional(),
    amount: money.optional(),
    currency: z.string().optional(),
    captureId: z.string().optional(),
  }),
  status: z.enum([
    "CONFIRMADO_DEMO",
    "PENDIENTE",
    "PAGADO",
    "CANCELADO",
    "REVISION",
    "REEMBOLSADO",
  ]),
  fingerprint: z.string(),
  expiresAt: z.number().optional(),
});
export const snapshotDto = z.object({
  products: z.array(productDto),
  rooms: z.array(roomDto),
  user: customerDto.nullable(),
  cart: cartDto,
  favorites: z.array(id),
  totals: totalsDto,
  orders: z.array(orderDto),
  count: z.number().int().nonnegative(),
  cartIssue: z.string(),
});
const schemas: Record<string, z.ZodType> = {
  snapshot: snapshotDto,
  "products.list": z.object({
    items: z.array(productDto),
    total: money,
    page: z.number().int().positive(),
    pages: z.number().int().positive(),
  }),
  "products.detail": productDto,
  "auth.register": customerDto,
  "auth.login": customerDto,
  "cart.change": cartDto,
  "auth.recover": z.string(),
  "orders.checkout": orderDto,
  "orders.detail": orderDto,
  "orders.list": z.array(orderDto),
  "email.subscribe": z.string(),
};
export function validateResponse(action: string, value: unknown): unknown {
  const parsed = (schemas[action] || z.null()).safeParse(value ?? null);
  if (!parsed.success)
    throw new Error("La respuesta no tiene el formato esperado. Vuelve a cargar la página.");
  return parsed.data;
}
