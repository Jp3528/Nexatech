import { existsSync, readFileSync } from 'node:fs';
import { pendingStorefront, storefrontSchema } from '../codigo/modelos/contenido-tienda';
export function readStorefront(path: string) {
  if (!existsSync(path)) return pendingStorefront;
  const data = storefrontSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  if (data.approved && JSON.stringify(data).includes('[DATO PENDIENTE]'))
    throw new Error('El contenido aprobado todavía contiene datos pendientes.');
  return data;
}
