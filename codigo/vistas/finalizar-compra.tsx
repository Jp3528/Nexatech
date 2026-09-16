import { formText } from '../modelos/formularios';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useShop } from '../controladores/usar-tienda';
import { shop } from '../controladores/cliente';
import type { Address } from '../modelos/dominio';
import { Breadcrumb, EmptyState, Field, go, OrderSummary } from './interfaz';
export function AddressFields({ address }: { address?: Address }) {
  return (
    <>
      <Field
        label="Nombre de la dirección"
        name="name"
        defaultValue={address?.name || 'Casa'}
        required
        maxLength={80}
      />
      <Field
        label="Dirección"
        name="street"
        autoComplete="street-address"
        defaultValue={address?.street}
        required
        minLength={5}
        maxLength={200}
      />
      <div className="form-grid">
        <Field
          label="Departamento"
          name="department"
          defaultValue={address?.department}
          required
          maxLength={80}
        />
        <Field
          label="Provincia"
          name="city"
          defaultValue={address?.city}
          required
          maxLength={80}
        />
        <Field
          label="Distrito"
          name="district"
          defaultValue={address?.district}
          required
          maxLength={80}
        />
        <Field
          label="Referencia (opcional)"
          name="reference"
          defaultValue={address?.reference}
          maxLength={200}
        />
      </div>
    </>
  );
}
export function addressFromForm(d: FormData, id = '') {
  return {
    id,
    name: formText(d, 'name'),
    street: formText(d, 'street'),
    department: formText(d, 'department'),
    city: formText(d, 'city'),
    district: formText(d, 'district'),
    reference: formText(d, 'reference'),
  };
}
export function Checkout() {
  const { state, act, busy } = useShop(),
    [key] = useState(() => crypto.randomUUID()),
    [addressId, setAddressId] = useState('');
  if (!state) return null;
  if (!state.user)
    return (
      <section className="wrap page">
        <EmptyState
          title="Guarda tu selección en tu cuenta"
          description="Inicia sesión o crea una cuenta para continuar con el pedido."
          action="Iniciar sesión"
          to="/login?next=checkout"
        />
      </section>
    );
  if (!state.count)
    return (
      <section className="wrap page">
        <EmptyState />
      </section>
    );
  const selected = state.user.addresses.find((a) => a.id === addressId);
  return (
    <section className="wrap page">
      <Breadcrumb title="Checkout" />
      <h1>A un paso de sentirse en casa.</h1>
      <p className="notice">
        Revisa tus datos de contacto, dirección de entrega, medio de pago y resumen antes de confirmar el pedido.
      </p>
      <div className="steps">
        <strong>01 · Tus datos</strong>
        <span>02 · Entrega</span>
        <span>03 · Pago</span>
      </div>
      <div className="checkout-layout">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            const order = await act(
              () =>
                shop.orders.checkout({
                  key,
                  email: d.get('email'),
                  address: addressFromForm(d, addressId),
                  method: d.get('method'),
                  consent: d.get('consent') === 'on',
                }),
              'Pedido confirmado.',
            );
            if (order) go('/compra-completada/' + order.id);
          }}
        >
          <h3>1. Datos de contacto</h3>
          <Field label="Cliente" value={state.user.name} readOnly />
          <Field
            label="Correo electrónico"
            name="email"
            type="email"
            defaultValue={state.user.email}
            required
          />
          <h3>2. ¿Dónde lo recibirás?</h3>
          {state.user.addresses.length > 0 && (
            <label className="field">
              Dirección guardada
              <select
                value={addressId}
                onChange={(e) => setAddressId(e.target.value)}
              >
                <option value="">Nueva dirección</option>
                {state.user.addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {a.street}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div key={addressId}>
            <AddressFields address={selected} />
          </div>
          <p className="notice">
            Envío estándar: S/ 15. En compras desde S/ 350 el envío se calcula como gratuito en el resumen.
          </p>
          <h3>3. Elige cómo pagar</h3>
          <fieldset className="payment-options">
            <legend className="sr-only">Medio de pago</legend>
            {['PayPal', 'Tarjeta', 'Yape'].map((v, i) => (
              <label key={v}>
                <input
                  type="radio"
                  name="method"
                  value={v}
                  defaultChecked={i === 0}
                />
                {v}
                <small>Disponible para configurar</small>
              </label>
            ))}
          </fieldset>
          <label className="check">
            <input name="consent" type="checkbox" required /> Acepto las{' '}
            <a href="/informacion/Términos">condiciones de compra</a>
            .
          </label>
          <button className="button" disabled={busy || !!state.cartIssue}>
            {busy ? 'Confirmando…' : 'Confirmar pedido'}
            <ArrowRight size={18} />
          </button>
        </form>
        <OrderSummary
          totals={state.totals}
          count={state.count}
          checkout
          coupon={state.cart.coupon}
        />
      </div>
    </section>
  );
}
