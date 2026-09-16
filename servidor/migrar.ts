import { readFileSync, existsSync } from "node:fs";
import { createPool } from "./base-datos";
import { readConfig } from "./configuracion";
import { DemoRepository } from "../codigo/repositorios/repositorio-demo";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const config = readConfig();
const pool = createPool(config.CASAVIVA_DATABASE_URL);
const client = await pool.connect();
const migrationSql = (name: string) =>
  readFileSync(new URL("./migraciones/" + name, import.meta.url), "utf8");

async function relationExists(name: string) {
  const result = await client.query("SELECT to_regclass($1) AS name", [name]);
  return Boolean(result.rows[0]?.name);
}

async function roomsKindIsAllowed() {
  const result = await client.query(
    `SELECT pg_get_constraintdef(c.oid) AS definition
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'casaviva'
        AND t.relname = 'records'
        AND c.conname = 'records_kind_check'`,
  );
  const definition = String(result.rows[0]?.definition || "");
  return definition.includes("'rooms'");
}

try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(7240193)");
  const hasRecords = await relationExists("casaviva.records");
  if (!hasRecords) {
    await client.query(migrationSql("001_inicial.sql"));
    const state = await new DemoRepository(() => true, 0).read();
    if (config.CASAVIVA_DEMO !== "true") {
      state.products = [];
      state.coupons = [];
    }
    await client.query("INSERT INTO casaviva.store VALUES (1,$1,$2,now()) ON CONFLICT DO NOTHING", [
      JSON.stringify(state),
      config.CASAVIVA_DEMO === "true",
    ]);
    await client.query(migrationSql("002_registros.sql"));
    await client.query(migrationSql("003_correo.sql"));
  } else if (!(await relationExists("casaviva.mail_outbox"))) {
    await client.query(migrationSql("003_correo.sql"));
  }

  if (!(await roomsKindIsAllowed())) await client.query(migrationSql("004_ambientes.sql"));
  else
    await client.query("INSERT INTO casaviva.migrations(version) VALUES(4) ON CONFLICT DO NOTHING");

  await client.query("COMMIT");
  console.log("Migración NexaTech aplicada. Los datos existentes se conservaron.");
} catch (error) {
  await client.query("ROLLBACK");
  process.exitCode = 1;
  console.error("No se pudo aplicar la migración. Revisa conexión y permisos.");
  console.error(error instanceof Error ? error.message : "Error desconocido.");
} finally {
  client.release();
  await pool.end();
}
