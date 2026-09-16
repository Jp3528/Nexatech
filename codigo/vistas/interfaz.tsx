import {
  ArrowRight,
  ArrowUpRight,
  Heart,
  Plus,
  Minus,
  ChevronRight,
  ShoppingBag,
  AlertCircle,
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import type { ReactNode, InputHTMLAttributes } from 'react';
import { available, type Product, type Totals } from '../modelos/dominio';
import { categories } from '../datos/datos-demo';
import { shop } from '../controladores/cliente';
import { useShop } from '../controladores/usar-tienda';
import { navigate } from '../rutas';
import { productPath } from '../modelos/metadatos-seo';
export function go(path: string) {
  navigate(path);
}
export const currency = (cents: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(
    cents / 100,
  );
export function Price({
  value,
  previous,
}: {
  value: number;
  previous?: number;
}) {
  return (
    <div className="price">
      <strong>{currency(value)}</strong>
      {previous !== undefined && previous > value && (
        <>
          <del>{currency(previous)}</del>
          <small className="accent">
            −{Math.round((1 - value / previous) * 100)}%
          </small>
        </>
      )}
    </div>
  );
}
export function Rating({
  value,
  count = 0,
}: {
  value?: number;
  count?: number;
}) {
  return (
    <span
      className="rating"
      aria-label={
        value ? `${value} de 5, ${count} reseñas verificadas` : 'Aún sin reseñas'
      }
    >
      {value ? '★ ' + value.toFixed(1) + ' · ' + count : 'Sin reseñas'}
    </span>
  );
}
export function Photo({
  src,
  alt,
  atlas,
  className = '',
  eager = false,
}: {
  src: string;
  alt: string;
  atlas?: number;
  className?: string;
  eager?: boolean;
}) {
  return (
    <div className={'product-photo ' + className}>
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        width={800}
        height={800}
        className={atlas !== undefined ? 'atlas' : ''}
        style={
          atlas !== undefined
            ? {
                left: `${-(atlas % 4) * 100}%`,
                top: `${-Math.floor(atlas / 4) * 100}%`,
              }
            : undefined
        }
      />
    </div>
  );
}
export function QuantitySelector({
  value,
  max,
  onChange,
  label = 'Cantidad',
  disabled = false,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <div className="quantity">
      <button
        type="button"
        disabled={disabled || value <= 1}
        aria-label={'Reducir ' + label}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={14} />
      </button>
      <output aria-label={label}>{value}</output>
      <button
        type="button"
        disabled={disabled || value >= Math.min(20, max)}
        aria-label={'Aumentar ' + label}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
export function AddToCartButton({
  product,
  variantId,
  quantity = 1,
  compact = false,
}: {
  product: Product;
  variantId?: string;
  quantity?: number;
  compact?: boolean;
}) {
  const { act, busy } = useShop();
  const v =
    product.variants.find((x) => x.id === variantId) || product.variants[0];
  return (
    <button
      className={compact ? 'add icon' : 'button'}
      disabled={busy || available(v) < quantity}
      aria-label={'Agregar al carrito: ' + product.name}
      onClick={() =>
        void act(
          () => shop.cart.change(v.id, quantity, true),
          'Producto agregado al carrito.',
        )
      }
    >
      {compact ? (
        <Plus size={18} />
      ) : (
        <>
          {available(v) > 0 ? 'Agregar al carrito' : 'Agotado'}
          <ArrowRight size={18} />
        </>
      )}
    </button>
  );
}
export function ProductCard({ product: p }: { product: Product }) {
  const { state, act, busy } = useShop();
  const v = p.variants[0],
    saved = state?.favorites.includes(p.id);
  const rating = p.reviews.length
    ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length
    : undefined;
  return (
    <article className="product-card">
      <div className="product-image">
        <a href={productPath(p)}>
          <Photo src={p.images[0]} alt={p.name} atlas={p.atlas} />
        </a>
        <span className={'badge ' + (p.tag === 'Oferta' ? 'sale' : '')}>
          {p.variants.every((x) => available(x) === 0) ? 'Agotado' : p.tag}
        </span>
        <button
          disabled={busy}
          className={'favorite icon ' + (saved ? 'selected' : '')}
          aria-label={
            (saved ? 'Quitar de' : 'Añadir a') + ' favoritos: ' + p.name
          }
          aria-pressed={!!saved}
          onClick={() =>
            void act(
              () => shop.cart.favorite(p.id),
              saved
                ? 'Producto eliminado de favoritos.'
                : 'Producto guardado en favoritos.',
            )
          }
        >
          <Heart size={19} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="product-card-body">
        <p className="meta">
          {categories.find((c) => c.id === p.categoryId)?.name}
          <Rating value={rating} count={p.reviews.length} />
        </p>
        <a className="product-name" href={productPath(p)}>
          {p.name}
        </a>
        <div className="price-row">
          <Price value={v.price} previous={v.previousPrice} />
          <AddToCartButton product={p} compact />
        </div>
      </div>
    </article>
  );
}
export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
export function CategoryCard({
  id,
  name,
  image,
}: {
  id: string;
  name: string;
  image: string;
}) {
  return (
    <a className="category-card" href={'/categoria/' + id}>
      <Photo src={image} alt={name} />
      <span>
        {name}
        <ArrowUpRight size={17} />
      </span>
    </a>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  link = 'Ver todo',
  to = '/productos',
}: {
  eyebrow?: string;
  title: string;
  link?: string;
  to?: string;
}) {
  return (
    <div className="section-title">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      <a className="text-link" href={to}>
        {link}
        <ArrowUpRight size={18} />
      </a>
    </div>
  );
}
export function Breadcrumb({ title }: { title: string }) {
  return (
    <nav className="breadcrumb" aria-label="Ruta de navegación">
      <a href="/">Inicio</a>
      <ChevronRight size={13} />
      <span aria-current="page">{title}</span>
    </nav>
  );
}
const LazyModal = lazy(() =>
  import('./modal').then((m) => ({ default: m.Modal })),
);
export function Modal(props: React.ComponentProps<typeof LazyModal>) {
  return props.open ? (
    <Suspense fallback={null}>
      <LazyModal {...props} />
    </Suspense>
  ) : null;
}
export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="field">
      {label}
      <input {...props} />
    </label>
  );
}
export function EmptyState({
  title = 'Tu carrito está esperando',
  description = 'Encuentra el equipo que mejora tu setup, tu trabajo o tu entretenimiento.',
  action = 'Explorar productos',
  to = '/productos',
}: {
  title?: string;
  description?: string;
  action?: string;
  to?: string;
}) {
  return (
    <div className="empty">
      <ShoppingBag size={40} strokeWidth={1} />
      <h2>{title}</h2>
      <p>{description}</p>
      <a className="button" href={to}>
        {action}
        <ArrowRight size={18} />
      </a>
    </div>
  );
}
export function Loading() {
  return (
    <output className="wrap page loading" aria-label="Cargando">
      <div className="skeleton line" />
      <div className="product-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton" />
        ))}
      </div>
    </output>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="inline-error" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
      {retry && (
        <button className="text-link" onClick={retry}>
          Volver a intentar
        </button>
      )}
    </div>
  );
}
export function OrderSummary({
  totals,
  count,
  checkout = false,
  coupon,
  children,
}: {
  totals: Totals;
  count: number;
  checkout?: boolean;
  coupon?: string;
  children?: ReactNode;
}) {
  return (
    <aside className="order-summary">
      <h3>Resumen de tu pedido</h3>
      <p>
        {count} artículos<span>{currency(totals.subtotal)}</span>
      </p>
      <p>
        Descuento {coupon && `(${coupon})`}
        <span>−{currency(totals.discount)}</span>
      </p>
      <p>
        Envío
        <span>{totals.shipping ? currency(totals.shipping) : 'Gratis'}</span>
      </p>
      <div className="summary-total">
        Total <Price value={totals.total} />
      </div>
      <small>El total se actualizará antes de confirmar el pedido.</small>
      {children}
      {!checkout && count > 0 && (
        <a className="button full" href="/checkout">
          Continuar con mi pedido <ArrowRight size={18} />
        </a>
      )}
    </aside>
  );
}
