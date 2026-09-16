import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { available, errorMessage, type Product } from '../modelos/dominio';
import { categories } from '../datos/datos-demo';
import { shop } from '../controladores/cliente';
import { useShop } from '../controladores/usar-tienda';
import {
  AddToCartButton,
  Breadcrumb,
  ErrorState,
  Loading,
  Photo,
  Price,
  ProductGrid,
  QuantitySelector,
  Rating,
  SectionTitle,
} from './interfaz';
export function ProductPage({ id }: { id: string }) {
  const { state, act, busy } = useShop();
  const [product, setProduct] = useState<Product | null>(null),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0),
    [variantId, setVariantId] = useState(''),
    [quantity, setQuantity] = useState(1),
    [image, setImage] = useState(0);
  useEffect(() => {
    let alive = true;
    setError('');
    shop.products
      .detail(id)
      .then((p) => {
        if (alive) {
          setProduct(p);
          setVariantId((v) =>
            p.variants.some((x) => x.id === v) ? v : p.variants[0].id,
          );
        }
      })
      .catch((e) => {
        if (alive) setError(errorMessage(e));
      });
    return () => {
      alive = false;
    };
  }, [id, state, retry]);
  if (error)
    return (
      <section className="wrap page">
        <ErrorState message={error} retry={() => setRetry((n) => n + 1)} />
        <a className="text-link" href="/productos">
          Volver al catálogo
        </a>
      </section>
    );
  if (!product) return <Loading />;
  const v =
      product.variants.find((x) => x.id === variantId) || product.variants[0],
    saved = state?.favorites.includes(product.id);
  return (
    <section className="wrap page">
      <Breadcrumb title={product.name} />
      <div className="detail-layout">
        <div>
          <Photo
            src={product.images[image]}
            alt={
              image === 0
                ? product.name
            : 'Escena de inspiración; no representa una variante del producto'
            }
            atlas={image === 0 ? product.atlas : undefined}
            className="detail-photo"
            eager
          />
          <div className="gallery-thumbs">
            {product.images.map((src, i) => (
              <button
                key={src}
                aria-label={
                  i === 0 ? 'Ver producto' : 'Ver escena de inspiración'
                }
                aria-pressed={image === i}
                onClick={() => setImage(i)}
              >
                <Photo
                  src={src}
                  atlas={i === 0 ? product.atlas : undefined}
                  alt={i === 0 ? 'Producto' : 'Setup de inspiración'}
                />
              </button>
            ))}
          </div>
          <p className="image-disclaimer">
            Imagen conceptual. Las escenas de setup son de inspiración.
          </p>
        </div>
        <div className="detail-copy">
          <p className="eyebrow">
            {categories.find((c) => c.id === product.categoryId)?.name} /{' '}
            {product.brand.name}
          </p>
          <h1>{product.name}</h1>
          <Rating
            value={
              product.reviews.length
                ? product.reviews.reduce((s, r) => s + r.rating, 0) /
                  product.reviews.length
                : undefined
            }
            count={product.reviews.length}
          />
          <Price value={v.price} previous={v.previousPrice} />
          <p>{product.description}</p>
          <p>
            Configuración: <strong>{v.name}</strong>
          </p>
          <div className="swatches">
            {product.variants.map((x) => (
              <button
                key={x.id}
                aria-label={'Configuración ' + x.name}
                aria-pressed={x.id === v.id}
                className={x.id === v.id ? 'active' : ''}
                style={{ background: x.color }}
                onClick={() => {
                  setVariantId(x.id);
                  setQuantity(1);
                }}
              />
            ))}
          </div>
          <p className={available(v) ? 'muted' : 'accent'}>
            {available(v)
              ? `${available(v)} unidades disponibles`
              : 'Producto agotado'}
          </p>
          <QuantitySelector
            value={quantity}
            max={available(v)}
            disabled={busy || available(v) === 0}
            onChange={setQuantity}
          />
          <div className="detail-actions">
            <AddToCartButton
              product={product}
              variantId={v.id}
              quantity={quantity}
            />
            <button
              disabled={busy}
              className="icon outline"
              aria-label="Guardar producto en favoritos"
              aria-pressed={!!saved}
              onClick={() =>
                void act(
                  () => shop.cart.favorite(product.id),
                  'Favoritos actualizados.',
                )
              }
            >
              <Heart fill={saved ? 'currentColor' : 'none'} />
            </button>
          </div>
          <details open>
            <summary>Características</summary>
            <dl>
              {Object.entries(product.specifications).map(([k, val]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{val}</dd>
                </div>
              ))}
            </dl>
          </details>
          <details>
            <summary>Envío y devoluciones</summary>
            <p>
              Envío estándar S/ 15; gratuito desde S/ 350. Los equipos viajan con embalaje reforzado y puedes solicitar cambios o devoluciones según las políticas de compra.
            </p>
          </details>
        </div>
      </div>
      <section>
        <h2>Opiniones del producto</h2>
        {product.reviews.length ? (
          product.reviews.map((r) => (
            <article className="review-detail" key={r.id}>
              <Rating value={r.rating} count={1} />
              <p>{r.comment}</p>
              <small>{r.name} · compra verificada</small>
            </article>
          ))
        ) : (
          <p className="notice">Todavía no hay opiniones de este producto.</p>
        )}
      </section>
      <SectionTitle title="Queda bien con…" />
      <ProductGrid
        products={
          state?.products.filter((p) => p.id !== product.id).slice(0, 4) || []
        }
      />
    </section>
  );
}
