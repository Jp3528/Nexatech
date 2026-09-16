import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogSchema } from '../servidor/importar-catalogo';
import { pendingStorefront, storefrontSchema } from '../codigo/modelos/contenido-tienda';
import { products } from '../codigo/datos/datos-demo';
import { indexablePath, sitemap, pageHtml } from '../servidor/metadatos';
await test('catálogo real rechaza fixtures, reservas manuales y variantes duplicadas', () => {
  assert.equal(
    catalogSchema.safeParse({ approved: true, products }).success,
    false,
  );
  const product = structuredClone(products[0]);
  delete product.atlas;
  product.reviews = [];
  product.specifications = { Material: 'Lino de prueba' };
  assert.equal(
    catalogSchema.safeParse({ approved: true, products: [product] }).success,
    true,
  );
  const duplicate = structuredClone(product);
  duplicate.id = 'another';
  assert.equal(
    catalogSchema.safeParse({ approved: true, products: [product, duplicate] })
      .success,
    false,
  );
  product.variants[0].inventory.reserved = 1;
  assert.equal(
    catalogSchema.safeParse({ approved: true, products: [product] }).success,
    false,
  );
  assert.equal(storefrontSchema.safeParse(pendingStorefront).success, true);
});
await test('sitemap excluye cuenta, búsqueda y pagos; metadatos cierran indexación por defecto', () => {
  for (const path of [
    '/cuenta',
    '/carrito',
    '/checkout',
    '/buscar',
    '/pedido/1',
    '/restablecer',
  ])
    assert.equal(indexablePath(path), false);
  const xml = sitemap('https://example.invalid', [
    '/',
    '/productos',
    '/cuenta',
  ]);
  assert.ok(xml.includes('/productos'));
  assert.ok(!xml.includes('/cuenta'));
  assert.match(
    pageHtml('<head></head>', '/', 'https://example.invalid'),
    /noindex, nofollow/,
  );
});
