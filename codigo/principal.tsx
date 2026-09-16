import React, { useEffect, useState, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { currentRoute, installRouter } from './rutas';
import { metadata, productSlug } from './modelos/metadatos-seo';
import { Toast } from './vistas/avisos';
import { ShopProvider, useShop } from './controladores/usar-tienda';
import { Header, Footer } from './vistas/estructura';
import { AsistenteCompra } from './vistas/asistente-compra';
import { Home } from './vistas/inicio';
const Catalog = lazy(() =>
  import('./vistas/catalogo').then((m) => ({ default: m.Catalog })),
);
const Information = lazy(() =>
  import('./vistas/informacion').then((m) => ({ default: m.Information })),
);
const ProductPage = lazy(() =>
  import('./vistas/producto').then((m) => ({ default: m.ProductPage })),
);
const CartPage = lazy(() =>
  import('./vistas/carrito').then((m) => ({ default: m.CartPage })),
);
const Checkout = lazy(() =>
  import('./vistas/finalizar-compra').then((m) => ({ default: m.Checkout })),
);
const AuthPage = lazy(() =>
  import('./vistas/autenticacion').then((m) => ({ default: m.AuthPage })),
);
const AccountPage = lazy(() =>
  import('./vistas/cuenta').then((m) => ({ default: m.AccountPage })),
);
const AdminPage = lazy(() =>
  import('./vistas/admin').then((m) => ({ default: m.AdminPage })),
);
const Confirmation = lazy(() =>
  import('./vistas/cuenta').then((m) => ({ default: m.Confirmation })),
);
import {
  Breadcrumb,
  EmptyState,
  ErrorState,
  Loading,
  ProductGrid,
} from './vistas/interfaz';
import './estilos.css';
import './aplicacion.css';
function App() {
  const [route, setRoute] = useState(currentRoute);
  const { state, error, toast, clearToast, refresh } = useShop();
  const routePath = route.split('?')[0];
  useEffect(() => {
    const update = () => {
      setRoute(currentRoute());
    };
    const removeRouter = installRouter();
    update();
    window.addEventListener('popstate', update);
    return () => {
      removeRouter();
      window.removeEventListener('popstate', update);
    };
  }, []);
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [routePath]);
  useEffect(() => {
    const path = route.split('?')[0];
    const product = state?.products.find(
      (p) => path === '/producto/' + productSlug(p),
    );
    const meta = metadata(path, product);
    document.title = meta.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', meta.description);
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute('content', meta.title);
    document
      .querySelector('meta[property="og:description"]')
      ?.setAttribute('content', meta.description);
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute('href', location.origin + path);
  }, [route, state]);
  let path;
  try {
    path = decodeURIComponent(route.split('?')[0]);
  } catch {
    path = '/404';
  }
  let view;
  if (!state)
    view = error ? (
      <section className="wrap page">
        <ErrorState message={error} retry={() => void refresh()} />
      </section>
    ) : (
      <Loading />
    );
  else if (path === '/') view = <Home />;
  else if (
    path === '/productos' ||
    path === '/buscar' ||
    path.startsWith('/categoria/')
  )
    view = <Catalog route={route} />;
  else if (path.startsWith('/producto/'))
    view = <ProductPage key={path} id={path.split('/')[2]} />;
  else if (path === '/carrito') view = <CartPage />;
  else if (path === '/checkout') view = <Checkout />;
  else if (['/login', '/registro', '/recuperar', '/restablecer'].includes(path))
    view = <AuthPage key={route} route={route} />;
  else if (path === '/admin') view = <AdminPage />;
  else if (
    ['/cuenta', '/cuenta/direcciones', '/cuenta/pedidos'].includes(path) ||
    path.startsWith('/pedido/')
  )
    view = <AccountPage key={path} route={path} />;
  else if (path.startsWith('/compra-completada/'))
    view = <Confirmation id={path.split('/')[2]} />;
  else if (path === '/cuenta/favoritos')
    view = (
      <section className="wrap page">
        <Breadcrumb title="Favoritos" />
        <h1>Guarda lo que te inspira.</h1>
        {state.favorites.length ? (
          <ProductGrid
            products={state.products.filter((p) =>
              state.favorites.includes(p.id),
            )}
          />
        ) : (
          <EmptyState
            title="Tus próximos favoritos están por llegar"
            description="Pulsa el corazón de un producto para guardarlo aquí."
          />
        )}
      </section>
    );
  else if (path.startsWith('/informacion/'))
    view = <Information title={path.split('/')[2]} />;
  else
    view = (
      <section className="wrap page">
        <EmptyState
          title="No encontramos esta página"
          description="Continúa explorando la selección NexaTech."
        />
      </section>
    );
  return (
    <>
      <a
        className="skip"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Saltar al contenido
      </a>
      <Header />
      {error && state && (
        <div className="global-error">
          <ErrorState message={error} retry={() => void refresh()} />
        </div>
      )}
      <main id="main" tabIndex={-1}>
        <Suspense fallback={<Loading />}>{view}</Suspense>
      </main>
      <Footer />
      <AsistenteCompra />
      <Toast message={toast} onClose={clearToast} />
    </>
  );
}
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <section className="wrap page">
        <h1>No pudimos cargar esta página</h1>
        <p>
          Tu información permanece guardada. Comprueba tu conexión y vuelve a
          intentarlo.
        </p>
        <button className="button" onClick={() => location.reload()}>
          Volver a cargar
        </button>
      </section>
    ) : (
      this.props.children
    );
  }
}
const root =
  import.meta.hot?.data.root ?? createRoot(document.getElementById('root')!);
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <ShopProvider>
        <App />
      </ShopProvider>
    </AppErrorBoundary>
  </React.StrictMode>,
);


