import { createApp } from '../servidor/aplicacion';
import { createPool } from '../servidor/base-datos';
import { readConfig } from '../servidor/configuracion';

const config = readConfig();
let pool = null;
if (config.CASAVIVA_DATABASE_URL) {
  try {
    pool = createPool(config.CASAVIVA_DATABASE_URL);
  } catch {
    pool = null;
  }
}

const app = createApp(pool, config);

export const maxDuration = 30;
export default app;
