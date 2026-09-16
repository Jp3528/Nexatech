import { formText } from '../modelos/formularios';
import { useState } from 'react';
import {
  Search,
  ArrowRight,
  UserRound,
  Heart,
  ShoppingBag,
  Menu,
  ArrowUpRight,
  Truck,
  ShieldCheck,
  RotateCcw,
  Headphones,
} from 'lucide-react';
import { categories } from '../datos/datos-demo';
import { useShop } from '../controladores/usar-tienda';
import { shop } from '../controladores/cliente';
import { go, Modal, Field } from './interfaz';
export function SearchBar() {
  const [q, setQ] = useState('');
  return (
    <search>
      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault();
          go('/buscar?q=' + encodeURIComponent(q.trim()));
        }}
      >
        <Search size={18} />
        <input
          aria-label="Buscar productos"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Busca laptop, audio, gaming..."
          maxLength={100}
        />
        {q && (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            onClick={() => setQ('')}
          >
            ×
          </button>
        )}
        <button aria-label="Buscar">
          <ArrowRight size={17} />
        </button>
      </form>
    </search>
  );
}
export function Navigation({ close }: { close?: () => void }) {
  return (
    <nav
      className={close ? 'menu-list' : 'desktop-nav wrap'}
      aria-label="Categorías"
    >
      <a href="/productos" onClick={close}>
        Catálogo
      </a>
      {categories.map((c) => (
        <a key={c.id} href={'/categoria/' + c.id} onClick={close}>
          {c.name}
        </a>
      ))}
      <a className="accent" href="/productos?new=1" onClick={close}>
        Nuevos lanzamientos <ArrowUpRight size={14} />
      </a>
    </nav>
  );
}
export function Header() {
  const { state } = useShop(),
    [menu, setMenu] = useState(false);
  return (
    <>
      <div className="announcement">
        NexaTech · tecnología seleccionada · stock visible · soporte especializado
      </div>
      <header>
        <div className="header-main wrap">
          <button
            className="icon mobile-only"
            aria-label="Abrir menú"
            onClick={() => setMenu(true)}
          >
            <Menu />
          </button>
          <a href="/" className="brand" aria-label="NexaTech inicio">
            <span className="brand-symbol" aria-hidden="true">
              <svg viewBox="0 0 48 48" focusable="false">
                <rect x="13" y="13" width="22" height="22" rx="5" />
                <path d="M19 8v5M29 8v5M19 35v5M29 35v5M8 19h5M8 29h5M35 19h5M35 29h5" />
                <path d="M20 28 24 20l4 8" />
              </svg>
            </span>
            <span className="brand-text">NexaTech<small>SETUPS Y TECNOLOGÍA</small></span>
          </a>
          <SearchBar />
          <div className="header-actions">
            <a href="/cuenta" aria-label="Mi cuenta">
              <UserRound />
            </a>
            <a
              href="/cuenta/favoritos"
              aria-label={'Favoritos: ' + (state?.favorites.length || 0)}
            >
              <Heart />
              {!!state?.favorites.length && <b>{state.favorites.length}</b>}
            </a>
            <a href="/carrito" aria-label={'Carrito: ' + (state?.count || 0)}>
              <ShoppingBag />
              <b>{state?.count || 0}</b>
            </a>
          </div>
        </div>
        <Navigation />
      </header>
      <Modal open={menu} onOpenChange={setMenu} title="Explora NexaTech">
        <Navigation close={() => setMenu(false)} />
      </Modal>
    </>
  );
}
export function Benefits() {
  return (
    <div className="benefits wrap">
      {[
        [Truck, 'Envíos protegidos', 'Embalaje seguro para equipos'],
        [ShieldCheck, 'Garantía clara', 'Cobertura por falla de fabricación'],
        [RotateCcw, 'Cambios técnicos', 'Revisión sujeta a política'],
        [Headphones, 'Soporte experto', 'Ayuda antes y después de comprar'],
      ].map(([Icon, title, text]) => {
        const I = Icon as typeof Truck;
        return (
          <div key={String(title)}>
            <I size={25} strokeWidth={1.3} />
            <div>
              <strong>{String(title)}</strong>
              <span>{String(text)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
export function Footer() {
  const { act, busy } = useShop();
  return (
    <>
      <section className="newsletter">
        <div className="wrap newsletter-inner">
          <div>
            <p className="eyebrow">ALERTAS PARA TU SETUP</p>
            <h2>
              Novedades, ofertas
              <br />
              y guías útiles.
            </h2>
            <p>Lanzamientos, comparativas y accesorios que sí suman a tu equipo.</p>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget,
                d = new FormData(form);
              const ok = await act(async () => {
                await shop.email.subscribe(
                  formText(d, 'email'),
                  d.get('consent') === 'on',
                );
                return true;
              }, 'Suscripción registrada. Te enviaremos novedades de NexaTech.');
              if (ok) form.reset();
            }}
          >
            <Field
              label="Tu correo electrónico"
              name="email"
              type="email"
              required
              placeholder="nombre@ejemplo.com"
            />
            <button disabled={busy} className="button full">
              Recibir novedades <ArrowRight size={18} />
            </button>
            <label className="check">
              <input name="consent" type="checkbox" required /> He leído la{' '}
              <a href="/informacion/Privacidad">política de privacidad</a>.
            </label>
          </form>
        </div>
      </section>
      <footer>
        <div className="wrap footer-grid">
          <div>
            <a className="brand" href="/" aria-label="NexaTech inicio">
              <span className="brand-symbol" aria-hidden="true">
                <svg viewBox="0 0 48 48" focusable="false">
                  <rect x="13" y="13" width="22" height="22" rx="5" />
                  <path d="M19 8v5M29 8v5M19 35v5M29 35v5M8 19h5M8 29h5M35 19h5M35 29h5" />
                  <path d="M20 28 24 20l4 8" />
                </svg>
              </span>
              <span className="brand-text">NexaTech</span>
            </a>
            <p>
              Un setup no se improvisa.
              <br />
              Se elige, se combina y se potencia.
            </p>
          </div>
          {[
            ['Explora', 'Laptops', 'Audio', 'Perifericos', 'Gaming'],
            ['Te ayudamos', 'Envíos', 'Devoluciones', 'Garantía', 'Contacto'],
            [
              'Conócenos',
              'Nuestra historia',
              'Privacidad',
              'Términos',
              'Redes sociales',
            ],
          ].map((col, i) => (
            <div key={col[0]}>
              <strong>{col[0]}</strong>
              {col.slice(1).map((l) => (
                <a
                  key={l}
                  href={
                    i === 0
                      ? '/categoria/' + categories.find((c) => c.name === l)?.id
                      : '/informacion/' + encodeURIComponent(l)
                  }
                >
                  {l}
                </a>
              ))}
            </div>
          ))}
        </div>
        <div className="wrap footer-bottom">
          <span>NexaTech · Tecnología para tu setup</span>
          <span>PayPal · Tarjeta · Yape</span>
          <a href="/informacion/Términos">Políticas de compra</a>
          <a href="/admin">Administración</a>
        </div>
      </footer>
    </>
  );
}


