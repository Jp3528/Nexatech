import { useEffect, useState } from 'react';
import {
  pendingStorefront,
  storefrontSchema,
  type Storefront,
} from '../modelos/contenido-tienda';
import { ErrorState, Loading } from './interfaz';
export function Information({ title }: { title: string }) {
  const [data, setData] = useState<Storefront | null>(null),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setError(false);
    void fetch('/api/storefront', { signal: abort.signal })
      .then(async (r) => {
        if (!r.ok) throw Error();
        return storefrontSchema.parse(await r.json());
      })
      .then(setData)
      .catch(() => {
        if (!abort.signal.aborted) setError(true);
      });
    return () => abort.abort();
  }, [retry]);
  return (
    <section className="wrap page">
      <h1>{title}</h1>
      {error ? (
        <ErrorState
          message="No se pudo cargar la información."
          retry={() => setRetry((n) => n + 1)}
        />
      ) : !data ? (
        <Loading />
      ) : (
        <>
          <p style={{ whiteSpace: 'pre-line' }}>
            {data.pages[title as keyof typeof pendingStorefront.pages] ||
              'Estamos preparando esta información para publicarla.'}
          </p>
          {!data.approved && (
            <p className="notice">
              Información comercial en revisión por NexaTech.
            </p>
          )}
        </>
      )}
      <a className="text-link" href="/">
        Volver al inicio →
      </a>
    </section>
  );
}
