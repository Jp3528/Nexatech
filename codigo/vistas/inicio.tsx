import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useShop } from '../controladores/usar-tienda';
import { categories } from '../datos/datos-demo';
import { ProductGrid, SectionTitle } from './interfaz';
import { Benefits } from './estructura';
import { SalaInteractiva } from './sala-interactiva';

const heroSlides = [
  {
    kicker: 'Nueva generación',
    title: ['Más potencia.', 'Menos ruido.'],
    copy: 'Laptops, monitores y accesorios elegidos para trabajar, crear y jugar sin perder tiempo comparando lo de siempre.',
    image:
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=2200&q=90',
    href: '/categoria/laptops',
    cta: 'Explorar laptops',
  },
  {
    kicker: 'Audio inmersivo',
    title: ['Silencio', 'inteligente.'],
    copy: 'Audífonos, parlantes y micrófonos con mejor cancelación, voz clara y comodidad para sesiones largas.',
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=2200&q=90',
    href: '/categoria/audio',
    cta: 'Comprar audio',
  },
  {
    kicker: 'Gaming performance',
    title: ['Juega sin', 'límites.'],
    copy: 'Periféricos precisos, monitores rápidos y accesorios que hacen que tu setup se sienta más pro.',
    image:
      'https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=2200&q=90',
    href: '/categoria/gaming',
    cta: 'Construir setup',
  },
];

const bento = [
  {
    id: 'laptops',
    eyebrow: 'Computación',
    title: 'Laptops & Ultrabooks',
    className: 'large',
  },
  {
    id: 'perifericos',
    eyebrow: 'Visual y control',
    title: 'Monitores y periféricos',
    className: 'wide',
  },
  { id: 'audio', eyebrow: 'Audio', title: 'Escucha mejor', className: '' },
  { id: 'gaming', eyebrow: 'Gaming', title: 'Rendimiento pro', className: '' },
];

function PremiumHero() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = window.setInterval(
      () => setActive((current) => (current + 1) % heroSlides.length),
      6200,
    );
    return () => window.clearInterval(id);
  }, []);
  const slide = heroSlides[active];
  const previous = () =>
    setActive((current) => (current + heroSlides.length - 1) % heroSlides.length);
  const next = () => setActive((current) => (current + 1) % heroSlides.length);
  return (
    <section className="premium-hero wrap" aria-label="Novedades NexaTech">
      <div className="premium-hero-shell">
        {heroSlides.map((item, index) => (
          <img
            key={item.kicker}
            src={item.image}
            alt=""
            aria-hidden={index !== active}
            className={'premium-hero-media ' + (index === active ? 'active' : '')}
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding="async"
            width={2200}
            height={1400}
          />
        ))}
        <div className="premium-hero-copy">
          <p className="eyebrow">{slide.kicker}</p>
          <h1>
            {slide.title[0]}
            <br />
            <em>{slide.title[1]}</em>
          </h1>
          <p>{slide.copy}</p>
          <div className="premium-hero-actions">
            <a className="button light" href={slide.href}>
              {slide.cta} <ArrowRight size={18} />
            </a>
            <a className="button ghost" href="/productos">
              Ver catálogo <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
        <div className="premium-hero-index" aria-live="polite">
          <strong>{String(active + 1).padStart(2, '0')}</strong>
          <span>/ {String(heroSlides.length).padStart(2, '0')}</span>
        </div>
        <div className="premium-hero-controls">
          <button type="button" onClick={previous} aria-label="Anterior">
            <ChevronLeft size={20} />
          </button>
          <button type="button" onClick={next} aria-label="Siguiente">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      <div className="premium-micro-grid">
        <article className="premium-micro-card">
          <p className="eyebrow">NexaTech Select</p>
          <h2>Curamos tecnología que se siente mejor desde el primer uso.</h2>
          <p>Selección por diseño, rendimiento, garantía y compatibilidad.</p>
        </article>
        <article className="premium-micro-card dark">
          <p className="eyebrow">Entrega local</p>
          <h2>Lima Express</h2>
          <strong>24h</strong>
        </article>
      </div>
    </section>
  );
}

export function Home() {
  const { state } = useShop();
  const bentoCategories = useMemo(
    () =>
      bento
        .map((item) => ({
          ...item,
          category: categories.find((category) => category.id === item.id),
        }))
        .filter((item) => item.category),
    [],
  );
  if (!state) return null;
  const featured = state.products.slice(0, 6);
  const novelties = state.products.filter((product) => product.tag === 'Nuevo').slice(0, 4);
  const offers = state.products.filter((product) => product.tag === 'Oferta').slice(0, 4);
  return (
    <>
      <PremiumHero />
      <Benefits />
      <section className="wrap section premium-section">
        <div className="premium-section-head">
          <div>
            <p className="eyebrow">COMPRA POR UNIVERSO</p>
            <h2>
              Todo tu ecosistema,
              <br />
              en un solo lugar.
            </h2>
          </div>
          <p>
            Una experiencia más editorial: menos ruido, mejores productos y rutas rápidas para
            encontrar lo que realmente necesitas.
          </p>
        </div>
        <div className="premium-bento">
          {bentoCategories.map(({ id, eyebrow, title, className, category }) => (
            <a
              key={id}
              className={'premium-bento-card ' + className}
              href={'/categoria/' + id}
            >
              <img src={category!.image} alt="" loading="lazy" width={1200} height={900} />
              <span className="premium-bento-shade" />
              <span className="premium-bento-copy">
                <small>{eyebrow}</small>
                <strong>{title}</strong>
              </span>
              <span className="premium-bento-arrow" aria-hidden="true">
                <ArrowUpRight size={20} />
              </span>
            </a>
          ))}
        </div>
      </section>
      <section className="premium-products-panel">
        <div className="wrap">
          <SectionTitle
            eyebrow="SELECCIÓN DESTACADA"
            title="Upgrade essentials"
            link="Ver todo"
            to="/productos"
          />
          <div className="premium-pill-row" aria-label="Categorías destacadas">
            <a href="/productos">Todo</a>
            <a href="/categoria/laptops">Computación</a>
            <a href="/categoria/gaming">Gaming</a>
            <a href="/categoria/audio">Audio</a>
            <a href="/categoria/accesorios">Accesorios</a>
          </div>
          <ProductGrid products={featured} />
        </div>
      </section>
      <section className="wrap section premium-workspace">
        <img
          src="https://images.unsplash.com/photo-1593642532400-2682810df593?auto=format&fit=crop&w=2200&q=90"
          alt=""
          loading="lazy"
          width={2200}
          height={1400}
        />
        <div className="premium-workspace-copy">
          <p className="eyebrow">NEXATECH WORKSPACE</p>
          <h2>Diseña un setup que trabaje contigo.</h2>
          <p>
            Combina pantalla, audio, iluminación y periféricos en una sola experiencia.
            Compra por piezas o arma tu espacio completo.
          </p>
          <a className="button light" href="/categoria/perifericos">
            Explorar workspace <ArrowRight size={18} />
          </a>
          <div className="premium-specs">
            <span>
              <strong>4K+</strong>
              Visual
            </span>
            <span>
              <strong>Hi-Res</strong>
              Audio
            </span>
            <span>
              <strong>1 ms</strong>
              Respuesta
            </span>
          </div>
        </div>
      </section>
      <section className="wrap section premium-room-section">
        <SectionTitle
          eyebrow="SETUP INTERACTIVO"
          title="Explora piezas reales dentro del escritorio"
          link="Ver catálogo"
          to="/productos"
        />
        {state.rooms[0] && <SalaInteractiva room={state.rooms[0]} products={state.products} />}
      </section>
      <section className="wrap section">
        <SectionTitle
          eyebrow="NOVEDADES DESTACADAS"
          title="Actualiza tu equipo con intención"
          link="Ver novedades"
          to="/productos?new=1"
        />
        <ProductGrid products={novelties} />
      </section>
      <section className="wrap section">
        <SectionTitle
          eyebrow="OFERTAS TECH"
          title="Descuentos en accesorios, gaming y conectividad"
          link="Ver ofertas"
          to="/productos"
        />
        <ProductGrid products={offers} />
      </section>
      <section className="wrap section reviews">
        <p className="eyebrow">COMPRAS VERIFICADAS</p>
        <h2>Lo que mejora tu día, se nota.</h2>
        <p className="muted">
          Clientes que eligieron NexaTech valoran la compatibilidad, el rendimiento y la atención antes de comprar.
        </p>
        <div className="review-grid">
          <article>
            <p className="review-stars">★★★★★</p>
            <blockquote>La laptop llegó lista, rápida y con garantía clara.</blockquote>
            <span>Valeria R. · compra verificada</span>
          </article>
          <article>
            <p className="review-stars">★★★★★</p>
            <blockquote>El dock resolvió mi escritorio sin comprar adaptadores sueltos.</blockquote>
            <span>Mariana C. · compra verificada</span>
          </article>
          <article>
            <p className="review-stars">★★★★★</p>
            <blockquote>El headset y el monitor hicieron gran diferencia para jugar y trabajar.</blockquote>
            <span>Andrea M. · cliente NexaTech</span>
          </article>
        </div>
      </section>
    </>
  );
}
