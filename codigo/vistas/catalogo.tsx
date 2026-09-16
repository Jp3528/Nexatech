import { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { categories } from '../datos/datos-demo';
import {
  defaultQuery,
  errorMessage,
  type Product,
  type Query,
} from '../modelos/dominio';
import { shop } from '../controladores/cliente';
import { useShop } from '../controladores/usar-tienda';
import {
  Breadcrumb,
  EmptyState,
  ErrorState,
  Field,
  go,
  Loading,
  Modal,
  ProductGrid,
} from './interfaz';
function readQuery(route: string): Query {
  const params = new URLSearchParams(route.split('?')[1]),
    path = route.split('?')[0];
  const finite = (s: string | null) =>
    s !== null && s !== '' && Number.isFinite(Number(s))
      ? Math.max(0, Number(s))
      : undefined;
  return {
    ...defaultQuery,
    q: params.get('q') || '',
    category: path.startsWith('/categoria/')
      ? decodeURIComponent(path.split('/')[2])
      : params.get('category') || '',
    brand: params.get('brand') || '',
    sort: ['name', 'price-asc', 'price-desc'].includes(params.get('sort') || '')
      ? (params.get('sort') as Query['sort'])
      : 'selection',
    min: finite(params.get('min')),
    max: finite(params.get('max')),
    available: params.get('available') === '1',
    page: Math.floor(finite(params.get('page')) || 1),
    newOnly: params.get('new') === '1',
  };
}
export function Filters({
  query,
  onChange,
}: {
  query: Query;
  onChange: (q: Partial<Query>) => void;
}) {
  return (
    <div className="filter-options">
      <p className="eyebrow">POR CATEGORÍA</p>
      {[{ id: '', name: 'Todas' }, ...categories].map((c) => (
        <label className="check" key={c.id}>
          <input
            type="radio"
            name="category"
            checked={query.category === c.id}
            onChange={() => onChange({ category: c.id })}
          />
          {c.name}
        </label>
      ))}
      <label className="field">
        Marca
        <select
          value={query.brand}
          onChange={(e) => onChange({ brand: e.target.value })}
        >
          <option value="">Todas</option>
          <option value="nexatech">NexaTech</option>
        </select>
      </label>
      <p className="eyebrow">PRECIO EN SOLES</p>
      <Field
        label="Precio mínimo"
        type="number"
        min="0"
        value={query.min ?? ''}
        onChange={(e) =>
          onChange({ min: e.target.value ? Number(e.target.value) : undefined })
        }
      />
      <Field
        label="Precio máximo"
        type="number"
        min="0"
        value={query.max ?? ''}
        onChange={(e) =>
          onChange({ max: e.target.value ? Number(e.target.value) : undefined })
        }
      />
      <label className="check">
        <input
          type="checkbox"
          checked={query.available}
          onChange={(e) => onChange({ available: e.target.checked })}
        />{' '}
        Solo disponibles
      </label>
      <button
        className="text-link"
        onClick={() => onChange({ ...defaultQuery, q: query.q })}
      >
        Limpiar filtros
      </button>
    </div>
  );
}
export function Catalog({ route }: { route: string }) {
  const { state } = useShop();
  const query = readQuery(route),
    [result, setResult] = useState<{
      items: Product[];
      total: number;
      page: number;
      pages: number;
    } | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0),
    [open, setOpen] = useState(false);
  const key = JSON.stringify(query);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    shop.products
      .list(JSON.parse(key))
      .then((r) => {
        if (alive) setResult(r);
      })
      .catch((e) => {
        if (alive) setError(errorMessage(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [key, retry, state]);
  function change(patch: Partial<Query>) {
    const next = { ...query, ...patch, page: patch.page ?? 1 },
      p = new URLSearchParams();
    if (next.q) p.set('q', next.q);
    if (next.category) p.set('category', next.category);
    if (next.brand) p.set('brand', next.brand);
    if (next.sort !== 'selection') p.set('sort', next.sort);
    if (next.min !== undefined) p.set('min', String(next.min));
    if (next.max !== undefined) p.set('max', String(next.max));
    if (next.available) p.set('available', '1');
    if (next.newOnly) p.set('new', '1');
    if (next.page > 1) p.set('page', String(next.page));
    go(
      (route.startsWith('/buscar') ? '/buscar' : '/productos') +
        '?' +
        p.toString(),
    );
  }
  const title = route.startsWith('/buscar')
    ? query.q
      ? `Resultados para “${query.q}”`
      : 'Busca tu próximo equipo'
    : categories.find((c) => c.id === query.category)?.name ||
      (query.newOnly ? 'Nuevos lanzamientos' : 'Tecnología para tu setup');
  return (
    <section className="wrap page">
      <Breadcrumb title={title} />
      <div className="catalog-heading">
        <p className="eyebrow">ELIGE LO QUE VA CON TU SETUP</p>
        <h1>{title}</h1>
        <p>
          Filtra equipos, accesorios y periféricos por categoría, precio, stock y compatibilidad.
        </p>
        {query.q && (
          <button className="text-link" onClick={() => change({ q: '' })}>
            Limpiar búsqueda ×
          </button>
        )}
      </div>
      <div className="catalog-toolbar">
        <button className="filter-trigger" onClick={() => setOpen(true)}>
          <SlidersHorizontal size={17} /> Filtros
        </button>
        <output>
          {loading ? 'Buscando…' : `${result?.total || 0} productos`}
        </output>
        <label>
          Ordenar por{' '}
          <select
            value={query.sort}
            onChange={(e) => change({ sort: e.target.value as Query['sort'] })}
          >
            <option value="selection">Selección NexaTech</option>
            <option value="name">Nombre A–Z</option>
            <option value="price-asc">Menor precio</option>
            <option value="price-desc">Mayor precio</option>
          </select>
        </label>
      </div>
      <div className="catalog-layout">
        <aside className="desktop-filters">
          {!open && <Filters query={query} onChange={change} />}
        </aside>
        <div aria-busy={loading}>
          {error ? (
            <ErrorState message={error} retry={() => setRetry((n) => n + 1)} />
          ) : loading ? (
            <Loading />
          ) : result?.total ? (
            <>
              <ProductGrid products={result.items} />
              <nav className="pagination" aria-label="Páginas del catálogo">
                <button
                  disabled={result.page <= 1}
                  onClick={() => change({ page: result.page - 1 })}
                >
                  Anterior
                </button>
                <span>
                  Página {result.page} de {result.pages}
                </span>
                <button
                  disabled={result.page >= result.pages}
                  onClick={() => change({ page: result.page + 1 })}
                >
                  Siguiente
                </button>
              </nav>
            </>
          ) : (
            <EmptyState
              title="No encontramos esa combinación"
              description="Intenta otra palabra, ajusta tus filtros o explora todas las categorías."
            />
          )}
        </div>
      </div>
      <Modal open={open} onOpenChange={setOpen} title="Filtra tu selección">
        <Filters query={query} onChange={change} />
        <button className="button full" onClick={() => setOpen(false)}>
          Ver resultados
        </button>
      </Modal>
    </section>
  );
}
