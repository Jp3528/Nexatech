import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Boxes,
  Mail,
  PackageCheck,
  RefreshCw,
  Save,
  ShoppingCart,
} from 'lucide-react';
import { Breadcrumb, currency, EmptyState, Field, Photo } from './interfaz';

type AdminVariant = {
  id: string;
  name: string;
  price: number;
  previousPrice: number | null;
  stock: number;
  reserved: number;
};

type AdminProduct = {
  id: string;
  name: string;
  categoryId: string;
  tag: string;
  image: string;
  atlas?: number;
  variants: AdminVariant[];
};

type AdminOrder = {
  id: string;
  createdAt: string;
  status: string;
  email: string;
  total: number;
  items: number;
};

type AdminSummary = {
  metrics: {
    sales: number;
    orders: number;
    products: number;
    subscribers: number;
    stock: number;
  };
  products: AdminProduct[];
  orders: AdminOrder[];
  subscriptions: string[];
};

async function adminCall(action: string, body: unknown = {}) {
  const response = await fetch('/api/admin/' + action, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No se pudo cargar administración.');
  return data.result as AdminSummary;
}

function solesToCents(value: FormDataEntryValue | null) {
  const raw = typeof value === 'string' ? value : '';
  const number = Number(raw.replace(',', '.'));
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}

export function AdminPage() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const bestProducts = useMemo(
    () =>
      summary?.products
        .flatMap((product) =>
          product.variants.map((variant) => ({ product, variant })),
        )
        .sort((a, b) => b.variant.stock - a.variant.stock)
        .slice(0, 5) || [],
    [summary],
  );

  async function load() {
    setBusy(true);
    setError('');
    try {
      setSummary(await adminCall('summary'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function savePrice(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setNotice('');
    setError('');
    try {
      const previous = solesToCents(data.get('previousPrice'));
      const nextSummary = await adminCall('update-price', {
        productId: data.get('productId'),
        variantId: data.get('variantId'),
        price: solesToCents(data.get('price')),
        previousPrice: previous > 0 ? previous : null,
        stock: Number(data.get('stock')),
      });
      setSummary(nextSummary);
      localStorage.setItem('casaviva-data-version', String(Date.now()));
      window.dispatchEvent(new Event('casaviva:data-updated'));
      setNotice('Producto actualizado y publicado en la tienda.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="wrap page admin-page">
      <Breadcrumb title="Administración" />
      <div className="admin-hero">
        <div>
          <p className="eyebrow">PANEL NEXATECH</p>
          <h1>Gestión comercial tech.</h1>
          <p>
            Controla ventas, productos, precios, stock, pedidos y suscriptores desde un panel pensado para operación diaria.
          </p>
        </div>
        <button className="button light" disabled={busy} onClick={() => void load()}>
          <RefreshCw size={17} /> Actualizar datos
        </button>
      </div>

      {error && (
        <div className="notice" role="alert">
          {error}{' '}
          <a className="text-link" href="/login">
            Iniciar sesión
          </a>
        </div>
      )}
      {notice && <p className="notice">{notice}</p>}

      {!summary ? (
        error ? null : <EmptyState title="Cargando panel" description="Preparando métricas y productos." />
      ) : (
        <div className="admin-shell">
          <aside className="admin-sidebar">
            <strong>NexaTech Admin</strong>
            <a href="#metricas">Métricas</a>
            <a href="#productos">Productos y precios</a>
            <a href="#pedidos">Pedidos</a>
            <a href="#suscriptores">Suscriptores</a>
          </aside>
          <div className="admin-content">
            <section id="metricas" className="admin-cards">
              {[
                [BarChart3, 'Ventas', currency(summary.metrics.sales)],
                [ShoppingCart, 'Pedidos', String(summary.metrics.orders)],
                [Boxes, 'Productos', String(summary.metrics.products)],
                [Mail, 'Suscriptores', String(summary.metrics.subscribers)],
                [PackageCheck, 'Stock total', String(summary.metrics.stock)],
              ].map(([Icon, title, value]) => {
                const I = Icon as typeof BarChart3;
                return (
                  <article className="admin-card" key={String(title)}>
                    <I size={22} />
                    <span>{String(title)}</span>
                    <strong>{String(value)}</strong>
                  </article>
                );
              })}
            </section>

            <section className="admin-panel">
              <h2>Stock con mayor disponibilidad</h2>
              <div className="admin-bars">
                {bestProducts.map(({ product, variant }) => (
                  <div key={variant.id}>
                    <span>{product.name}</span>
                    <i style={{ width: Math.max(8, Math.min(100, variant.stock * 8)) + '%' }} />
                    <strong>{variant.stock}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section id="productos" className="admin-panel">
              <h2>Productos, precios y stock</h2>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Variantes, precios y stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.products.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <div className="admin-product-cell">
                            <Photo
                              src={product.image}
                              alt={product.name}
                              atlas={product.atlas}
                            />
                            <span>
                              <strong>{product.name}</strong>
                              <small>
                                {product.categoryId} · {product.tag} · {product.variants.length} variante{product.variants.length === 1 ? '' : 's'}
                              </small>
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="admin-variant-stack">
                            {product.variants.map((variant) => (
                              <form
                                key={variant.id}
                                className="admin-price-form"
                                onSubmit={savePrice}
                              >
                                <input type="hidden" name="productId" value={product.id} />
                                <input type="hidden" name="variantId" value={variant.id} />
                                <strong className="admin-variant-name">{variant.name}</strong>
                                <Field
                                  label="Precio"
                                  name="price"
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  defaultValue={(variant.price / 100).toFixed(2)}
                                  required
                                />
                                <Field
                                  label="Anterior"
                                  name="previousPrice"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  defaultValue={
                                    variant.previousPrice
                                      ? (variant.previousPrice / 100).toFixed(2)
                                      : ''
                                  }
                                />
                                <Field
                                  label="Stock"
                                  name="stock"
                                  type="number"
                                  min="0"
                                  step="1"
                                  defaultValue={variant.stock}
                                  required
                                />
                                <span className="admin-reserved">Reservado: {variant.reserved}</span>
                                <button className="button" disabled={busy}>
                                  <Save size={16} /> Guardar
                                </button>
                              </form>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section id="pedidos" className="admin-panel">
              <h2>Pedidos recientes</h2>
              {summary.orders.length ? (
                <div className="admin-orders">
                  {summary.orders.map((order) => (
                    <article key={order.id}>
                      <strong>Pedido {order.id.slice(0, 8).toUpperCase()}</strong>
                      <span>{new Date(order.createdAt).toLocaleString('es-PE')}</span>
                      <span>{order.email}</span>
                      <span>{order.items} unidades · {currency(order.total)}</span>
                      <b>{order.status}</b>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="notice">Aún no hay pedidos registrados.</p>
              )}
            </section>

            <section id="suscriptores" className="admin-panel">
              <h2>Suscriptores de novedades</h2>
              {summary.subscriptions.length ? (
                <div className="admin-tags">
                  {summary.subscriptions.map((email) => (
                    <span key={email}>{email}</span>
                  ))}
                </div>
              ) : (
                <p className="notice">Aún no hay correos suscritos.</p>
              )}
            </section>
          </div>
        </div>
      )}
    </section>
  );
}


