import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readConfig } from '../servidor/configuracion';
import { dispatch } from '../servidor/acciones';
import { ShopController } from '../codigo/controladores/controlador-tienda';
import { DemoRepository } from '../codigo/repositorios/repositorio-demo';
import { pageHtml } from '../servidor/metadatos';
import { products } from '../codigo/datos/datos-demo';
await test('producción exige configuración válida y HTTPS', () => {
  assert.throws(() => readConfig({}));
  assert.throws(() =>
    readConfig({
      NODE_ENV: 'production',
      CASAVIVA_DATABASE_URL: 'test',
      CASAVIVA_ORIGIN: 'http://localhost',
    }),
  );
  assert.equal(
    readConfig({
      NODE_ENV: 'production',
      CASAVIVA_DATABASE_URL: 'test',
      CASAVIVA_ORIGIN: 'https://example.invalid',
    }).CASAVIVA_DEMO,
    'false',
  );
});
await test('modo real bloquea pagos y correo sin generar falsos éxitos', async () => {
  const shop = new ShopController(new DemoRepository(() => true, 0));
  for (const action of [
    'orders.checkout',
    'auth.recover',
    'auth.reset',
    'email.subscribe',
  ])
    await assert.rejects(
      dispatch(shop, action, { args: [] }, false),
      /pendiente|habilitados|próximamente/,
    );
  assert.equal((await shop.snapshot()).orders.length, 0);
});
await test('SEO escapa contenido y no publica ofertas sintéticas', () => {
  const template = '<html><head><title>NexaTech</title></head></html>';
  const product = { ...products[0], name: '<script>alert(1)</script>' };
  const html = pageHtml(
    template,
    '/producto/prueba',
    'https://example.invalid',
    product,
    true,
  );
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('application/ld+json'));
  const real = pageHtml(
    template,
    '/producto/prueba',
    'https://example.invalid',
    product,
    false,
  );
  assert.ok(real.includes('application/ld+json'));
  assert.ok(!real.includes('<script>alert'));
});
