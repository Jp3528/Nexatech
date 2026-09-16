import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
// Starts only the existing workspace cluster. Never installs PostgreSQL or changes passwords.
export function ensureLocalPostgres() {
  if (process.env.NODE_ENV === 'production' || process.platform !== 'win32')
    return;
  const file = resolve('../.local-private/database.json');
  const data = resolve('../.local-private/pgdata');
  const bin = 'C:/Program Files/PostgreSQL/17/bin/pg_ctl.exe';
  if (
    !existsSync(file) ||
    !existsSync(resolve(data, 'PG_VERSION')) ||
    !existsSync(bin)
  )
    return;
  const cfg = JSON.parse(readFileSync(file, 'utf8'));
  // The migrated database is managed by the existing Windows PostgreSQL service.
  if (cfg.externalService) return;
  const status = spawnSync(bin, ['status', '-D', data], {
    windowsHide: true,
    stdio: 'ignore',
  });
  if (status.status === 0) return;
  const started = spawnSync(
    bin,
    [
      'start',
      '-D',
      data,
      '-l',
      resolve('../.local-private/postgres.log'),
      '-o',
      `-h 127.0.0.1 -p ${Number(cfg.port)}`,
      '-w',
    ],
    { windowsHide: true, stdio: 'ignore', timeout: 30000 },
  );
  if (started.status !== 0)
    throw new Error(
      'No se pudo iniciar el PostgreSQL local existente. Revisa el servicio o el registro privado.',
    );
}
