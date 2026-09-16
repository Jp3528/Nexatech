// Reuse the already configured local PostgreSQL; no credentials are printed.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import pg from "pg";
import { DemoRepository } from "../codigo/repositorios/repositorio-demo";
import { ensureLocalPostgres } from "./postgres-local";
ensureLocalPostgres();
process.loadEnvFile("../variables-entorno");
const cfg = JSON.parse(readFileSync("../.local-private/database.json", "utf8"));
const appUrl = new URL(process.env.DATABASE_URL!);
const owner = new pg.Client({
  host: "127.0.0.1",
  port: cfg.port,
  user: "nexo_owner",
  password: cfg.ownerPassword,
  database: "nexo_store",
});
await owner.connect();
try {
  await owner.query("BEGIN");
  await owner.query("SELECT pg_advisory_xact_lock(7240193)");
  await owner.query(
    readFileSync(new URL("./migraciones/001_inicial.sql", import.meta.url), "utf8"),
  );
  const state = await new DemoRepository(() => true, 0).read();
  await owner.query("INSERT INTO casaviva.store VALUES (1,$1,true,now()) ON CONFLICT DO NOTHING", [
    JSON.stringify(state),
  ]);
  await owner.query(
    readFileSync(new URL("./migraciones/002_registros.sql", import.meta.url), "utf8"),
  );
  await owner.query(readFileSync(new URL("./migraciones/003_correo.sql", import.meta.url), "utf8"));
  await owner.query(
    readFileSync(new URL("./migraciones/004_ambientes.sql", import.meta.url), "utf8"),
  );
  await owner.query(
    "GRANT USAGE ON SCHEMA casaviva TO nexo_app; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA casaviva TO nexo_app",
  );
  await owner.query("COMMIT");
  if (!existsSync(".env.local"))
    writeFileSync(
      ".env.local",
      `CASAVIVA_DATABASE_URL=${appUrl.toString()}\nCASAVIVA_DEMO=true\nCASAVIVA_ORIGIN=http://127.0.0.1:3024\nCASAVIVA_PORT=3024\n`,
      { mode: 0o600 },
    );
  console.log("NexaTech local preparada en su esquema independiente. Nexo conservado.");
} catch (error) {
  await owner.query("ROLLBACK");
  process.exitCode = 1;
  console.error("No se pudo preparar NexaTech local.");
  console.error(error instanceof Error ? error.message : "Error desconocido.");
} finally {
  await owner.end();
}
