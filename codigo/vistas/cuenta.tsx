import { useState } from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { OrderStatus, orderLabels, paymentLabels } from './estado-pedido';
import { useShop } from '../controladores/usar-tienda';
import { shop } from '../controladores/cliente';
import type { Address, Order } from '../modelos/dominio';
import { AddressFields, addressFromForm } from './finalizar-compra';
import {
  Breadcrumb,
  currency,
  EmptyState,
  Field,
  go,
  Modal,
  OrderSummary,
  Photo,
  Price,
} from './interfaz';

function PurchaseReceipt({ order }: { order: Order }) {
  const code = 'FAC-' + new Date(order.createdAt).getFullYear() + '-' + order.id.slice(0, 8).toUpperCase();
  return (
    <section className="invoice-box">
      <div className="invoice-head">
        <div>
          <p className="eyebrow">COMPROBANTE NEXATECH</p>
          <h3>Factura / recibo {code}</h3>
          <p>
            Emitido: {new Date(order.createdAt).toLocaleString('es-PE')}<br />
            Cliente: {order.email}
          </p>
        </div>
        <button className="text-link" type="button" onClick={() => window.print()}>
          Imprimir comprobante
        </button>
      </div>
      <table className="invoice-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Precio</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.variantId}>
              <td>{item.name} · {item.variant}</td>
              <td>{item.quantity}</td>
              <td>{currency(item.price)}</td>
              <td>{currency(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan={3}>Subtotal</td><td>{currency(order.totals.subtotal)}</td></tr>
          <tr><td colSpan={3}>Descuento</td><td>{currency(order.totals.discount)}</td></tr>
          <tr><td colSpan={3}>Envío</td><td>{currency(order.totals.shipping)}</td></tr>
          <tr><td colSpan={3}>Total</td><td>{currency(order.totals.total)}</td></tr>
        </tfoot>
      </table>
      <p className="muted">
        Este comprobante resume la compra registrada en NexaTech. La emisión fiscal electrónica puede conectarse a un proveedor autorizado cuando se configuren los datos tributarios.
      </p>
    </section>
  );
}

export function OrderDetail({ order }: { order: Order }) {
  return (
    <>
      <h2>Pedido {order.id.slice(0, 8).toUpperCase()}</h2>
      <OrderStatus status={order.status} />
      {order.items.map((i) => (
        <article className="cart-item" key={i.variantId}>
          <Photo src={i.image} atlas={i.atlas} alt={i.name} />
          <div>
            <h3>{i.name}</h3>
            <p>
              {i.variant} · {i.quantity} unidades
            </p>
          </div>
          <Price value={i.price * i.quantity} />
        </article>
      ))}
      <div className="form-grid">
        <div className="info-box">
          <h3>Dirección de entrega</h3>
          <p>
            {order.address.street}
            <br />
            {order.address.district}, {order.address.city}
            <br />
            {order.address.department}
          </p>
        </div>
        <div className="info-box">
          <h3>Pago y contacto</h3>
          <p>
            {order.payment.method} · {paymentLabels[order.payment.status]}
            <br />
            {order.email}
          </p>
          <p>Seguimiento: recibirás actualizaciones del estado del pedido por correo cuando el canal esté configurado.</p>
        </div>
      </div>
      <OrderSummary
        totals={order.totals}
        count={order.items.reduce((n, i) => n + i.quantity, 0)}
        checkout
      />
      <PurchaseReceipt order={order} />
    </>
  );
}
export function AccountPage({ route }: { route: string }) {
  const { state, act, busy, error } = useShop();
  const [editing, setEditing] = useState<Address | null | undefined>(undefined);
  if (!state) return null;
  if (!state.user)
    return (
      <section className="wrap page">
        <EmptyState
          title="Este es tu espacio personal"
          description="Inicia sesión para consultar tu perfil, direcciones y pedidos."
          action="Iniciar sesión"
          to="/login"
        />
      </section>
    );
  const user = state.user,
    orderId = route.startsWith('/pedido/') ? route.split('/')[2] : undefined,
    order = state.orders.find((o) => o.id === orderId);
  const orders = route === '/cuenta/pedidos',
    addresses = route === '/cuenta/direcciones';
  return (
    <section className="wrap page">
      <Breadcrumb title="Mi cuenta" />
      <h1>Tu espacio NexaTech.</h1>
      <div className="account-layout">
        <aside className="account-nav">
          <p>Hola, {user.name}</p>
          {[
            ['Mi perfil', '/cuenta'],
            ['Mis direcciones', '/cuenta/direcciones'],
            ['Mis pedidos', '/cuenta/pedidos'],
            ['Mis favoritos', '/cuenta/favoritos'],
          ].map(([t, p]) => (
            <a
              href={p}
              className={route === p ? 'active' : ''}
              aria-current={route === p ? 'page' : undefined}
              key={p}
            >
              {t}
              <ChevronRight size={16} />
            </a>
          ))}
          <button
            className="logout"
            disabled={busy}
            onClick={async () => {
              await act(async () => {
                await shop.auth.logout();
                return true;
              }, 'Has cerrado sesión.');
              go('/');
            }}
          >
            Cerrar sesión
          </button>
        </aside>
        <div>
          {orderId ? (
            order ? (
              <OrderDetail order={order} />
            ) : (
              <EmptyState
                title="Pedido no disponible"
                description="No encontramos este pedido en tu cuenta."
                action="Ver mis pedidos"
                to="/cuenta/pedidos"
              />
            )
          ) : orders ? (
            <>
              <h2>Mis pedidos</h2>
              {state.orders.length ? (
                state.orders.map((o) => (
                  <a className="order-row" href={'/pedido/' + o.id} key={o.id}>
                    <Photo
                      src={o.items[0].image}
                      atlas={o.items[0].atlas}
                      alt={o.items[0].name}
                    />
                    <div>
                      <h3>Pedido {o.id.slice(0, 8).toUpperCase()}</h3>
                      <p>
                        {new Date(o.createdAt).toLocaleDateString('es-PE')} ·{' '}
                        {currency(o.totals.total)}
                      </p>
                      <span className="badge">
                        {orderLabels[o.status].title}
                      </span>
                    </div>
                    <ArrowRight />
                  </a>
                ))
              ) : (
                <EmptyState
                  title="Aún no tienes pedidos"
                  description="Tu próxima selección aparecerá aquí."
                />
              )}
            </>
          ) : addresses ? (
            <>
              <h2>Mis direcciones</h2>
              {user.addresses.length === 0 && (
                <p className="notice">Todavía no has guardado una dirección.</p>
              )}
              {user.addresses.map((a) => (
                <article className="address-card" key={a.id}>
                  <h3>{a.name}</h3>
                  <p>
                    {a.street} · {a.district}, {a.city}
                  </p>
                  <button className="text-link" onClick={() => setEditing(a)}>
                    Editar
                  </button>
                  <button
                    className="text-link"
                    disabled={busy}
                    onClick={() =>
                      void act(
                        () => shop.auth.removeAddress(a.id),
                        'Dirección eliminada.',
                      )
                    }
                  >
                    Eliminar
                  </button>
                </article>
              ))}
              <button className="button" onClick={() => setEditing(null)}>
                Añadir dirección
              </button>
            </>
          ) : (
            <>
              <h2>Mis datos</h2>
              <form
                key={user.id}
                onSubmit={async (e) => {
                  e.preventDefault();
                  const d = Object.fromEntries(new FormData(e.currentTarget));
                  await act(() => shop.auth.profile(d), 'Perfil actualizado.');
                }}
              >
                <div className="form-grid">
                  <Field
                    label="Nombre completo"
                    name="name"
                    autoComplete="name"
                    defaultValue={user.name}
                    required
                    minLength={2}
                  />
                  <Field
                    label="Correo electrónico"
                    name="email"
                    type="email"
                    autoComplete="email"
                    defaultValue={user.email}
                    required
                  />
                  <Field
                    label="Teléfono"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    defaultValue={user.phone}
                    required
                    minLength={7}
                  />
                </div>
                <button className="button" disabled={busy}>
                  Guardar cambios
                </button>
              </form>
              <p className="notice">
                Los cambios se guardan en tu cuenta NexaTech.
              </p>
            </>
          )}
        </div>
      </div>
      <Modal
        open={editing !== undefined}
        onOpenChange={(v) => {
          if (!v) setEditing(undefined);
        }}
        title={editing ? 'Editar dirección' : 'Nueva dirección'}
      >
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const data = addressFromForm(
              new FormData(e.currentTarget),
              editing?.id,
            );
            const ok = await act(async () => {
              await shop.auth.address(data);
              return true;
            }, 'Dirección guardada.');
            if (ok) setEditing(undefined);
          }}
        >
          <AddressFields address={editing || undefined} />
          <button className="button full" disabled={busy}>
            Guardar dirección
          </button>
        </form>
      </Modal>
    </section>
  );
}
export function Confirmation({ id }: { id: string }) {
  const { state } = useShop();
  const order = state?.orders.find((o) => o.id === id);
  return (
    <section className="wrap page confirmation">
      {order ? (
        <>
          <p className="eyebrow">TU PEDIDO NEXATECH</p>
          <h1>{orderLabels[order.status].title}</h1>
          <p>
            Pedido {order.id.slice(0, 8).toUpperCase()} ·{' '}
            {currency(order.totals.total)}
          </p>
          <OrderStatus status={order.status} />
          <a className="button" href={'/pedido/' + id}>
            Ver mi pedido <ArrowRight size={18} />
          </a>
        </>
      ) : (
        <EmptyState
          title="No hay una confirmación disponible"
          description="Consulta tus pedidos para continuar."
          to="/cuenta/pedidos"
          action="Ver pedidos"
        />
      )}
    </section>
  );
}
