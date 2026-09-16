import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import { createServer } from 'node:http';
import { readConfig } from './configuracion';
import { createPool } from './base-datos';
import { createApp } from './aplicacion';
import { pageHtml, publicPaths, indexablePath, sitemap } from './metadatos';
import { readStorefront } from './contenido-tienda';
import { productSlug } from '../codigo/modelos/metadatos-seo';
import type { Product } from '../codigo/modelos/dominio';
import { categories } from '../codigo/datos/datos-demo';
import { canonicalPath } from '../codigo/rutas';
import { ensureLocalPostgres } from './postgres-local';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const config = readConfig();
ensureLocalPostgres();
const pool = createPool(config.CASAVIVA_DATABASE_URL);
const store = (await pool.query('SELECT demo FROM casaviva.store WHERE id=1'))
  .rows[0];
if (!store || store.demo !== (config.CASAVIVA_DEMO === 'true'))
  throw new Error('Ejecuta la migración y verifica el modo de NexaTech.');
const app = createApp(pool, config);
const indexable =
  config.CASAVIVA_INDEXABLE === 'true' &&
  config.CASAVIVA_DEMO === 'false' &&
  readStorefront(config.CASAVIVA_CONTENT_FILE).approved;
const mailWorker = setInterval(() => {
  void app.locals.mailOutbox
    ?.drain()
    .catch(() => console.error('Cola de correo temporalmente no disponible.'));
}, 5000);
mailWorker.unref();
const server = createServer(app);
app.get('/robots.txt', (_req, res) =>
  res
    .type('text')
    .send(
      indexable
        ? 'User-agent: *\nDisallow: /api/\nDisallow: /dev/\nDisallow: /cuenta\nDisallow: /pedido/\nDisallow: /checkout\nDisallow: /carrito\nDisallow: /buscar\nSitemap: ' +
            config.CASAVIVA_ORIGIN +
            '/sitemap.xml\n'
        : 'User-agent: *\nDisallow: /\n',
    ),
);
// Indexing stays disabled until the real catalog and legal content are approved.
app.get('/sitemap.xml', async (_req, res) => {
  const products: Product[] = indexable
    ? (
        await pool.query(
          "SELECT data FROM casaviva.records WHERE kind='products'",
        )
      ).rows.map((r) => r.data)
    : [];
  res
    .type('xml')
    .send(
      sitemap(
        config.CASAVIVA_ORIGIN,
        indexable
          ? [
              '/',
              '/productos',
              ...categories.map((c) => '/categoria/' + c.id),
              ...products.map((p) => '/producto/' + productSlug(p)),
            ]
          : [],
      ),
    );
});
const dev = config.NODE_ENV === 'development';
const vite = dev
  ? await (
      await import('vite')
    ).createServer({
      configFile: resolve('configuracion-vite.ts'),
      server: { middlewareMode: true, ws: { server } },
      appType: 'custom',
    })
  : null;
if (vite) app.use(vite.middlewares);
app.use(
  '/recursos',
  express.static(resolve(dev ? 'publico/recursos' : 'dist/recursos'), {
    maxAge: dev ? 0 : '1d',
    index: false,
  }),
);
app.get('/recursos/{*path}', (_req, res) => res.sendStatus(404));
if (!dev)
  app.use(express.static(resolve('dist'), { index: false, maxAge: '1h' }));
app.use(async (req, res) => {
  if (req.method !== 'GET') return res.sendStatus(405);
  res.setHeader('Cache-Control', 'no-cache');
  let valid = publicPaths.test(req.path);
  const canonical = canonicalPath(req.path);
  if (canonical !== req.path)
    return res.redirect(
      308,
      canonical + (req.url.includes('?') ? '?' + req.url.split('?')[1] : ''),
    );
  let product: Product | undefined;
  if (req.path.startsWith('/producto/')) {
    const products: Product[] = (
      await pool.query(
        "SELECT data FROM casaviva.records WHERE kind='products' ORDER BY position",
      )
    ).rows.map((row) => row.data);
    product = products.find(
      (p) =>
        p.id === req.path.split('/')[2] ||
        productSlug(p) === req.path.split('/')[2],
    );
    valid = Boolean(product);
    if (product && req.path !== '/producto/' + productSlug(product))
      return res.redirect(308, '/producto/' + productSlug(product));
  }
  if (req.path.startsWith('/categoria/'))
    valid = categories.some((c) => c.id === req.path.split('/')[2]);
  const pageIndexable = indexable && valid && indexablePath(req.path);
  res.setHeader(
    'X-Robots-Tag',
    pageIndexable ? 'index, follow' : 'noindex, nofollow',
  );
  let html = pageHtml(
    readFileSync(dev ? 'index.html' : 'dist/index.html', 'utf8'),
    req.path,
    config.CASAVIVA_ORIGIN,
    product,
    config.CASAVIVA_DEMO === 'true',
    pageIndexable,
  );
  if (vite) html = await vite.transformIndexHtml(req.originalUrl, html);
  res
    .status(valid ? 200 : 404)
    .type('html')
    .send(html);
});
server.listen(config.CASAVIVA_PORT, '127.0.0.1', () =>
  console.log('NexaTech · ' + config.CASAVIVA_ORIGIN),
);
server.requestTimeout = 30000;
server.headersTimeout = 10000;
const cleanup = setInterval(() => {
  void pool
    .query(
      'DELETE FROM casaviva.sessions WHERE expires_at<now(); DELETE FROM casaviva.rate_limits WHERE expires_at<now()',
    )
    .catch(() => console.error('Limpieza pendiente.'));
}, 3600000);
cleanup.unref();
function stop() {
  clearInterval(mailWorker);
  clearInterval(cleanup);
  server.close(() => {
    void pool.end();
  });
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
