import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import pg from "pg";
import { createApp } from "../servidor/aplicacion";
import { createPool } from "../servidor/base-datos";
import { readConfig } from "../servidor/configuracion";
import { DemoRepository } from "../codigo/repositorios/repositorio-demo";
import { ensureLocalPostgres } from "../servidor/postgres-local";
ensureLocalPostgres();

await test(
  "HTTP y PostgreSQL: sesiones, autorización, persistencia, stock y reintentos",
  { skip: !existsSync("../.local-private/database.json") },
  async () => {
    const local = JSON.parse(readFileSync("../.local-private/database.json", "utf8"));
    const database = "casaviva_test_" + crypto.randomUUID().replaceAll("-", "");
    assert.match(database, /^casaviva_test_[a-f0-9]{32}$/);
    const connection = {
      host: "127.0.0.1",
      port: local.port,
      user: "nexo_owner",
      password: local.ownerPassword,
    };
    const admin = new pg.Client({ ...connection, database: "postgres" });
    await admin.connect();
    await admin.query("CREATE DATABASE " + database);
    const url = new URL("postgresql://127.0.0.1/" + database);
    url.port = String(local.port);
    url.username = connection.user;
    url.password = connection.password;
    const pool = createPool(url.toString());
    const config = readConfig({
      NODE_ENV: "test",
      CASAVIVA_DATABASE_URL: url.toString(),
      CASAVIVA_ORIGIN: "http://127.0.0.1:3024",
      CASAVIVA_DEMO: "true",
    });
    const app = createApp(pool, config);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((r) => server.on("listening", r));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const origin = "http://127.0.0.1:" + address.port;
    function client() {
      let cookie = "";
      return async (action: string, args: unknown[] = [], source = config.CASAVIVA_ORIGIN) => {
        const res = await fetch(origin + "/api/commerce/" + action, {
          method: "POST",
          headers: {
            Origin: source,
            "Content-Type": "application/json",
            Cookie: cookie,
          },
          body: JSON.stringify({ args }),
        });
        const next = res.headers.get("set-cookie");
        if (next) {
          assert.match(next, /HttpOnly/);
          assert.match(next, /SameSite=Lax/);
          cookie = next.split(";")[0];
        }
        return { status: res.status, body: await res.json(), cookie };
      };
    }
    try {
      await pool.query(
        readFileSync(new URL("../servidor/migraciones/001_inicial.sql", import.meta.url), "utf8"),
      );
      const state = await new DemoRepository(() => true, 0).read();
      await pool.query("INSERT INTO casaviva.store VALUES (1,$1,true,now())", [
        JSON.stringify(state),
      ]);
      for (const name of ["002_registros.sql", "003_correo.sql", "004_ambientes.sql"])
        await pool.query(
          readFileSync(new URL("../servidor/migraciones/" + name, import.meta.url), "utf8"),
        );
      const a = client(),
        b = client();
      assert.equal((await a("snapshot", [], "https://untrusted.invalid")).status, 403);
      assert.equal((await client()("snapshot", [], "http://localhost:3024")).status, 200);
      const guest = await a("snapshot");
      assert.equal(guest.body.result.count, 0);
      assert.equal(JSON.stringify(guest.body).includes("credentials"), false);
      await a("cart.change", ["cv-0-natural", 2]);
      await a("cart.coupon", ["NEXA10"]);
      assert.equal((await b("snapshot")).body.result.count, 0);
      const input = {
        name: "Cliente de prueba",
        email: "prueba@example.invalid",
        password: "SoloPrueba123!",
        consent: true,
      };
      const login = await a("auth.register", [input]);
      assert.equal(login.status, 200);
      assert.notEqual(login.cookie, guest.cookie);
      const snapshot = (await a("snapshot")).body.result;
      assert.equal(snapshot.count, 2);
      assert.equal(snapshot.totals.discount, 65980);
      assert.equal(snapshot.user.email, input.email);
      const checkout = {
        key: crypto.randomUUID(),
        email: input.email,
        address: {
          id: "",
          name: "Casa",
          street: "Calle de prueba 123",
          department: "Lima",
          city: "Lima",
          district: "Prueba",
          reference: "",
        },
        method: "Yape",
        consent: true,
        total: 1,
      };
      assert.equal((await b("orders.checkout", [checkout])).status, 401);
      const [one, two] = await Promise.all([
        a("orders.checkout", [checkout]),
        a("orders.checkout", [checkout]),
      ]);
      assert.equal(one.status, 200);
      assert.equal(two.status, 200);
      assert.equal(one.body.result.id, two.body.result.id);
      assert.equal(one.body.result.totals.total, 593820);
      assert.equal((await a("snapshot")).body.result.count, 0);
      assert.equal((await b("orders.detail", [one.body.result.id])).status, 401);
      await b("auth.register", [{ ...input, email: "otro@example.invalid" }]);
      assert.equal((await b("orders.detail", [one.body.result.id])).status, 404);
      assert.equal((await a("orders.checkout", [{ ...checkout, method: "PayPal" }])).status, 400);
      assert.equal((await a("cart.change", ["cv-7-natural", 1])).status, 409);
      assert.equal((await a("cart.change", ["cv-0-natural", 1.5])).status, 400);
      assert.equal((await a("products.list", [{ q: "nexabook" }])).body.result.total, 1);
      await a("auth.logout");
      assert.equal((await a("snapshot")).body.result.user, null);
      assert.equal((await a("auth.login", [{ ...input, password: "incorrecta" }])).status, 400);
      await a("auth.login", [input]);
      assert.equal((await a("orders.list")).body.result.length, 1);
      assert.equal((await a("auth.recover", [input.email])).body.result, "");
      const resetMail = (
        await pool.query("SELECT message FROM casaviva.mail_outbox WHERE key LIKE 'reset:%'")
      ).rows[0].message;
      const token = new URL(resetMail.text.match(/http[^\s]+/)[0]).searchParams.get("token");
      assert.ok(token);
      assert.equal(
        (
          await pool.query("SELECT key FROM casaviva.records WHERE kind='resets' AND key=$1", [
            token,
          ])
        ).rowCount,
        0,
      );
      await a("auth.reset", [token, "NuevaPrueba123!"]);
      assert.equal((await a("snapshot")).body.result.user, null);
      assert.equal((await a("auth.reset", [token, "NuevaPrueba123!"])).status, 400);
      await a("auth.login", [{ ...input, password: "NuevaPrueba123!" }]);
      assert.equal((await a("orders.list")).body.result.length, 1);
      // A fresh repository and connection still see the durable order.
      assert.equal(
        (
          await pool.query(
            "SELECT count(*)::integer AS count FROM casaviva.records WHERE kind='orders'",
          )
        ).rows[0].count,
        1,
      );
      assert.equal((await a("__proto__.constructor")).status, 404);
      const countBefore = (await pool.query("SELECT count(*)::int AS count FROM casaviva.records"))
        .rows[0].count;
      await pool.query(
        readFileSync(new URL("../servidor/migraciones/002_registros.sql", import.meta.url), "utf8"),
      );
      assert.equal(
        (await pool.query("SELECT count(*)::int AS count FROM casaviva.records")).rows[0].count,
        countBefore,
      );
      const started = performance.now();
      const concurrent = await Promise.all(Array.from({ length: 30 }, () => a("snapshot")));
      assert.ok(concurrent.every((r) => r.status === 200));
      console.log(
        "30 lecturas HTTP concurrentes completadas en " +
          Math.round(performance.now() - started) +
          " ms (entorno local).",
      );
      const { MailOutbox } = await import("../servidor/cola-correo");
      const delivered: string[] = [];
      const outbox = new MailOutbox(pool, {
        send: async (message) => {
          delivered.push(message.key);
        },
      });
      await Promise.all([outbox.drain(), outbox.drain()]);
      assert.equal(new Set(delivered).size, delivered.length);
      assert.ok(delivered.some((key) => key.startsWith("order:")));
      assert.equal(
        (
          await pool.query(
            "SELECT count(*)::int AS count FROM casaviva.mail_outbox WHERE sent_at IS NULL",
          )
        ).rows[0].count,
        0,
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
      await pool.end();
      // This database was created by this test, never the configured shop database.
      await admin.query("DROP DATABASE " + database);
      await admin.end();
    }
  },
);
