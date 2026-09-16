import { test } from "node:test";
import assert from "node:assert/strict";
import { DemoRepository } from "../codigo/repositorios/repositorio-demo";
import { ShopController } from "../codigo/controladores/controlador-tienda";
import { available, calculateTotals, validateItems, normalize } from "../codigo/modelos/dominio";
import { products, coupons } from "../codigo/datos/datos-demo";
const input = {
  name: "Cliente de prueba",
  email: "cliente@example.invalid",
  password: "PruebaLocal123!",
  consent: true,
};
const address = {
  id: "",
  name: "Casa de prueba",
  street: "Calle de prueba 123",
  department: "Lima",
  city: "Lima",
  district: "Distrito de prueba",
  reference: "",
};
function setup() {
  let online = true;
  const repo = new DemoRepository(() => online, 0);
  return {
    repo,
    shop: new ShopController(repo),
    offline: () => {
      online = false;
    },
    online: () => {
      online = true;
    },
  };
}
await test("búsqueda sin tildes, filtros, orden y páginas", async () => {
  const { shop } = setup();
  assert.equal(normalize("Periféricos"), "perifericos");
  const laptop = await shop.products.list({ q: "nexabook" });
  assert.ok(laptop.total >= 1);
  assert.ok(laptop.items.some((product) => product.name.includes("NexaBook")));
  assert.equal(
    (await shop.products.list({ category: "perifericos" })).items[0].name,
    "QuantumView 27 QHD",
  );
  const all = await shop.products.list({ sort: "price-asc", pageSize: 24 });
  const prices = all.items.map((product) =>
    Math.min(...product.variants.map((variant) => variant.price)),
  );
  assert.ok(prices.every((price, index) => index === 0 || price >= prices[index - 1]));
  assert.equal((await shop.products.list({ page: 2 })).items.length, 6);
  assert.equal((await shop.products.list({ q: "no-existe" })).total, 0);
  assert.equal(
    (await shop.products.list({ available: true })).total,
    products.filter((product) => product.variants.some((variant) => available(variant) > 0)).length,
  );
});
await test("inicio expone ambiente interactivo con productos reales", async () => {
  const { shop } = setup();
  const snapshot = await shop.snapshot();
  assert.equal(snapshot.rooms.length, 1);
  assert.equal(snapshot.rooms[0].slug, "setup-principal");
  assert.ok(snapshot.rooms[0].products.length >= 5);
  assert.ok(
    snapshot.rooms[0].products.every((item) =>
      snapshot.products.some((product) => product.id === item.productId),
    ),
  );
});
await test("cantidades inválidas, duplicados, agotado y stock no se aceptan", async () => {
  assert.throws(() => validateItems(products, [{ variantId: "cv-0-natural", quantity: 1.5 }]));
  assert.throws(() =>
    validateItems(products, [
      { variantId: "cv-0-natural", quantity: 1 },
      { variantId: "cv-0-natural", quantity: 1 },
    ]),
  );
  const { shop } = setup();
  await assert.rejects(shop.cart.change("cv-7-natural", 1));
  await assert.rejects(shop.cart.change("cv-0-marfil", 4));
  await assert.rejects(shop.cart.change("cv-0-natural", -1));
  assert.equal((await shop.snapshot()).count, 0);
});
await test("totales en céntimos, cupón, envío y eliminación", async () => {
  const { shop } = setup();
  await shop.cart.change("cv-0-natural", 2);
  await shop.cart.coupon("nexa10");
  let s = await shop.snapshot();
  assert.deepEqual(s.totals, {
    subtotal: 659800,
    discount: 65980,
    shipping: 0,
    total: 593820,
  });
  await assert.rejects(shop.cart.coupon("INVALIDO"));
  assert.equal((await shop.snapshot()).cart.coupon, "NEXA10");
  await shop.cart.change("cv-0-natural", 1);
  s = await shop.snapshot();
  assert.equal(s.cart.coupon, "NEXA10");
  await shop.cart.change("cv-0-natural", 0);
  assert.equal((await shop.snapshot()).totals.total, 0);
  assert.equal(
    calculateTotals(
      products,
      { items: [{ variantId: "cv-4-natural", quantity: 2 }], coupon: "" },
      coupons,
    ).shipping,
    0,
  );
});
await test("registro, login inválido, aislamiento y mezcla del carrito invitado", async () => {
  const { shop } = setup();
  await shop.cart.change("cv-0-natural", 1);
  await shop.cart.favorite("1");
  const a = await shop.auth.register(input);
  assert.equal((await shop.snapshot()).count, 1);
  await shop.auth.logout();
  assert.equal((await shop.snapshot()).favorites.length, 0);
  await assert.rejects(shop.auth.login({ ...input, password: "incorrecta" }));
  await shop.auth.register({ ...input, email: "otro@example.invalid" });
  assert.equal((await shop.snapshot()).count, 0);
  await shop.auth.logout();
  await shop.auth.login(input);
  assert.equal((await shop.snapshot()).user?.id, a.id);
  assert.equal((await shop.snapshot()).favorites[0], "1");
});
await test("direcciones, perfil y aislamiento de dirección", async () => {
  const { shop } = setup();
  await shop.auth.register(input);
  await shop.auth.address(address);
  const id = (await shop.snapshot()).user!.addresses[0].id;
  await shop.auth.address({
    ...address,
    id,
    street: "Otra calle de prueba 456",
  });
  assert.equal((await shop.snapshot()).user!.addresses.length, 1);
  await assert.rejects(shop.auth.address({ ...address, id: "ajeno" }));
  await shop.auth.profile({
    name: "Nombre actualizado",
    email: input.email,
    phone: "999000111",
  });
  assert.equal((await shop.snapshot()).user!.name, "Nombre actualizado");
  await shop.auth.removeAddress(id);
  assert.equal((await shop.snapshot()).user!.addresses.length, 0);
});
await test("checkout requiere sesión y carrito; crea pedido atómico sin doble consumo", async () => {
  const { shop } = setup();
  const d = {
    key: crypto.randomUUID(),
    address,
    email: input.email,
    method: "Yape",
    consent: true,
  };
  await assert.rejects(shop.orders.checkout(d));
  await shop.auth.register(input);
  await assert.rejects(shop.orders.checkout(d));
  await shop.cart.change("cv-0-marfil", 2);
  const [a, b] = await Promise.all([shop.orders.checkout(d), shop.orders.checkout(d)]);
  assert.equal(a.id, b.id);
  const s = await shop.snapshot();
  assert.equal(s.orders.length, 1);
  assert.equal(s.count, 0);
  assert.equal(s.products[0].variants[1].inventory.stock, 1);
  assert.equal(a.payment.status, "SIMULATED");
  await assert.rejects(shop.orders.checkout({ ...d, method: "PayPal" }));
  await shop.auth.logout();
  await shop.auth.register({ ...input, email: "otro@example.invalid" });
  await assert.rejects(shop.orders.detail(a.id));
});
await test("transacciones concurrentes no sobrepasan stock ni aplican cambios parciales", async () => {
  const { shop } = setup();
  await shop.cart.change("cv-0-marfil", 2);
  const results = await Promise.allSettled([
    shop.cart.change("cv-0-marfil", 1, true),
    shop.cart.change("cv-0-marfil", 1, true),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await shop.snapshot()).count, 3);
});
await test("recuperación local de un solo uso y nueva contraseña", async () => {
  const { shop } = setup();
  await shop.auth.register(input);
  assert.equal(await shop.auth.recover("ausente@example.invalid"), "");
  const token = await shop.auth.recover(input.email);
  await shop.auth.reset(token, "OtraPrueba123!");
  assert.equal((await shop.snapshot()).user, null);
  await assert.rejects(shop.auth.reset(token, "TerceraPrueba123!"));
  await assert.rejects(shop.auth.login(input));
  await shop.auth.login({ ...input, password: "OtraPrueba123!" });
  assert.equal((await shop.snapshot()).user?.email, input.email);
});
await test("fallo de red no modifica estado y se recupera sin pérdida", async () => {
  const { shop, offline, online } = setup();
  await shop.cart.change("cv-0-natural", 1);
  offline();
  await assert.rejects(shop.cart.change("cv-0-natural", 2), /Sin conexión/);
  online();
  assert.equal((await shop.snapshot()).count, 1);
  await shop.cart.change("cv-0-natural", 2);
  assert.equal((await shop.snapshot()).count, 2);
});
await test("newsletter valida email y consentimiento sin envío externo", async () => {
  const { shop, repo } = setup();
  await assert.rejects(shop.email.subscribe("incorrecto", true));
  await assert.rejects(shop.email.subscribe(input.email, false));
  await shop.email.subscribe(input.email, true);
  await shop.email.subscribe(input.email, true);
  assert.equal((await repo.read()).subscriptions.length, 1);
});
