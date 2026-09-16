import { existsSync } from 'node:fs';
import { createPool } from './base-datos';
import { readConfig } from './configuracion';
import { importCatalog, readCatalog, catalogSchema } from './importar-catalogo';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const file = process.argv[2];
if (!file)
  throw new Error('Uso: npm run catalog:import -- archivo.json [--validate]');
const input = readCatalog(file);
if (process.argv.includes('--validate')) {
  catalogSchema.parse(input);
  console.log('Estructura de catálogo válida. Sin cambios en PostgreSQL.');
} else {
  const pool = createPool(readConfig().CASAVIVA_DATABASE_URL);
  try {
    console.log('Productos importados: ' + (await importCatalog(pool, input)));
  } finally {
    await pool.end();
  }
}
