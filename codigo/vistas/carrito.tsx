import { useState } from 'react';
import { useShop } from '../controladores/usar-tienda';
import { shop } from '../controladores/cliente';
import { productPath } from '../modelos/metadatos-seo';
import {
  available,
  getVariant,
  type Product,
  type CartItem as Item,
} from '../modelos/dominio';
import {
  Breadcrumb,
  EmptyState,
  ErrorState,
  Field,
  OrderSummary,
  Photo,
  Price,
  QuantitySelector,
} from './interfaz';
export function CartItem({
  item,
  products,
}: {
  item: Item;
  products: Product[];
}) {
  const { act, busy } = useShop();
  const { product, variant } = getVariant(products, item.variantId);
  return (
    <article className="cart-item">
      <a href={productPath(product)}>
        <Photo
          src={product.images[0]}
          atlas={product.atlas}
          alt={product.name}
        />
      </a>
      <div>
        <h3>{product.name}</h3>
        <p className="muted">{variant.name}</p>
        <QuantitySelector
          value={item.quantity}
          max={available(variant)}
          label={product.name}
          disabled={busy}
          onChange={(q) => void act(() => shop.cart.change(item.variantId, q))}
        />
      </div>
      <div>
        <Price value={variant.price * item.quantity} />
        <button
          disabled={busy}
          className="remove"
          onClick={() =>
            void act(
              () => shop.cart.change(item.variantId, 0),
              'Producto eliminado del carrito.',
            )
          }
        >
          Eliminar
        </button>
      </div>
    </article>
  );
}
export function CouponForm() {
  const { state, act, busy } = useShop(),
    [code, setCode] = useState('');
  return (
    <form
      className="coupon-form"
      onSubmit={(e) => {
        e.preventDefault();
        void act(async () => {
          await shop.cart.coupon(code);
          return true;
        }, 'Cupón aplicado.');
      }}
    >
      <Field
        label="Código de cupón"
        value={code}
        maxLength={30}
        onChange={(e) => setCode(e.target.value)}
      />
      <button className="button full" disabled={busy || !code.trim()}>
        Aplicar cupón
      </button>
      {state?.cart.coupon && (
        <button
          type="button"
          className="text-link"
          onClick={() =>
            void act(async () => {
              await shop.cart.coupon('');
              return true;
            }, 'Cupón eliminado.')
          }
        >
          Quitar {state.cart.coupon}
        </button>
      )}
      <small>Usa NEXA10 desde S/ 1000 cuando la promoción esté vigente.</small>
    </form>
  );
}
export function CartPage() {
  const { state } = useShop();
  if (!state) return null;
  return (
    <section className="wrap page">
      <Breadcrumb title="Tu carrito" />
      <h1>Tu próximo upgrade empieza aquí.</h1>
      {!state.count ? (
        <EmptyState />
      ) : (
        <div className="checkout-layout">
          <div>
            <p className="muted">Tu selección · {state.count} artículos</p>
            {state.cartIssue && <ErrorState message={state.cartIssue} />}{' '}
            {state.cart.items.map((item) => (
              <CartItem
                key={item.variantId}
                item={item}
                products={state.products}
              />
            ))}
            <a className="text-link" href="/productos">
              Seguir explorando ↗
            </a>
          </div>
          <OrderSummary
            totals={state.totals}
            count={state.count}
            coupon={state.cart.coupon}
          >
            <CouponForm />
          </OrderSummary>
        </div>
      )}
    </section>
  );
}
