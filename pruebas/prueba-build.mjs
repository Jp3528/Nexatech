import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
const origin = process.env.CASAVIVA_TEST_ORIGIN || 'http://127.0.0.1:3025';
for (const path of ['/', '/productos', '/categoria/laptops', '/producto/nexabook-air-14-0', '/buscar', '/carrito', '/checkout', '/login', '/registro', '/recuperar', '/cuenta', '/cuenta/pedidos', '/cuenta/favoritos', '/cuenta/direcciones']) {
  const res = await fetch(origin + path);
  assert.equal(res.status,200,path);
  const html = await res.text();
  assert.match(html, /<title>[^<]+NexaTech<\/title>/);
  assert.match(html, /rel="canonical"/);
  assert.match(html, /og:title/);
  assert.equal(res.headers.get('x-robots-tag'),'noindex, nofollow');
  assert.ok(res.headers.get('content-security-policy'));
}
assert.equal((await fetch(origin+'/inexistente')).status,404);
assert.equal((await fetch(origin+'/producto/inexistente')).status,404);
assert.equal((await fetch(origin+'/categoria/inexistente')).status,404);
const redirect = await fetch(origin+'/catalogo',{redirect:'manual'});
assert.equal(redirect.status,308);
assert.equal(redirect.headers.get('location'),'/productos');
assert.match(await (await fetch(origin+'/robots.txt')).text(),/Disallow: \//);
for (const asset of readdirSync('dist/recursos')) {
  const response = await fetch(origin+'/recursos/'+asset);
  assert.equal(response.status,200,asset);
  assert.ok((await response.arrayBuffer()).byteLength>0,asset);
  if (asset.endsWith('.js')) assert.doesNotMatch(readFileSync('dist/recursos/'+asset,'utf8'),/CASAVIVA_DATABASE_URL|PBKDF2|CREATE TABLE|ownerPassword/);
}
console.log('Build servido: 14 rutas, 404, redirecciones, SEO, CSP, robots y todos los assets verificados. Sin código privado del servidor en los bundles.');
