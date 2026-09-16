import { metadata } from '../codigo/modelos/metadatos-seo';
import type { Product } from '../codigo/modelos/dominio';
export const publicPaths =
  /^\/(?:productos|catalogo|buscar|carrito|checkout|login|registro|recuperar|restablecer|admin|cuenta(?:\/(?:pedidos|favoritos|direcciones))?|pedidos|direcciones|favoritos|(?:producto|categoria|pedido|compra-completada|informacion)\/[^/]+)?$/;
export const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
export function pageHtml(
  html: string,
  path: string,
  origin: string,
  product?: Product,
  demo = true,
  indexable = false,
) {
  const meta = metadata(path, product);
  const jsonLd =
    product && !demo
      ? '<script type="application/ld+json">' +
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: product.description,
          sku: product.id,
          brand: { '@type': 'Brand', name: product.brand.name },
          url: origin + path,
        }).replace(/</g, '\\u003c') +
        '</script>'
      : '';
  return html
    .replace(/<meta name="robots"[^>]*>/g, '')
    .replace(
      /<title>.*?<\/title>/s,
      '<title>' + escape(meta.title) + '</title>',
    )
    .replace(/<meta name="description"[^>]*>/, '')
    .replace(
      '</head>',
      `<meta name="robots" content="${indexable ? 'index, follow' : 'noindex, nofollow'}"><meta name="description" content="${escape(meta.description)}"><meta property="og:title" content="${escape(meta.title)}"><meta property="og:description" content="${escape(meta.description)}"><meta property="og:type" content="website"><meta property="og:image" content="${escape(origin)}/recursos/hero-desktop-1600.webp"><link rel="canonical" href="${escape(origin + path)}">${jsonLd}</head>`,
    );
}
export function indexablePath(path: string) {
  return /^\/(?:productos|categoria\/[^/]+|producto\/[^/]+)?$/.test(path);
}
export function sitemap(origin: string, paths: string[]) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    paths
      .filter(indexablePath)
      .map((path) => '<url><loc>' + escape(origin + path) + '</loc></url>')
      .join('') +
    '</urlset>'
  );
}

