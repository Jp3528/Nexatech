import pg from 'pg';
import { pack, unpack, type RecordRow } from './registros';
import { createHash, randomBytes } from 'node:crypto';
import type { CommerceRepository, State } from '../codigo/repositorios/contratos';
import { DomainError } from '../codigo/modelos/dominio';
export const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export const newToken = () => randomBytes(32).toString('hex');
export function createPool(url: string) {
  const pool = new pg.Pool({
    connectionString: url,
    max: 8,
    connectionTimeoutMillis: 5000,
    statement_timeout: 20000,
    application_name: 'casaviva',
  });
  pool.on('error', () => console.error('Conexión PostgreSQL interrumpida.'));
  return pool;
}
export class PostgresRepository implements CommerceRepository {
  nextToken: string | null = null;
  constructor(
    private pool: pg.Pool,
    private token: string,
    private demo: boolean,
  ) {}
  async read() {
    return this.transaction((s) => structuredClone(s), false);
  }
  async transaction<T>(
    action: (s: State) => T | Promise<T>,
    write = true,
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const client = await this.pool.connect();
      try {
        await client.query(
          write
            ? 'BEGIN ISOLATION LEVEL SERIALIZABLE'
            : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY',
        );
        const row = (
          await client.query('SELECT demo FROM casaviva.store WHERE id = 1')
        ).rows[0];
        if (!row || row.demo !== this.demo)
          throw new Error('Store mode mismatch');
        const session = (
          await client.query(
            'SELECT * FROM casaviva.sessions WHERE token_hash=$1 AND expires_at > now()',
            [digest(this.token)],
          )
        ).rows[0];
        if (!session)
          throw new DomainError(
            'La sesión ha caducado. Recarga la página.',
            'unauthorized',
          );
        const rows: RecordRow[] = (
          await client.query(
            'SELECT kind,key,data,position FROM casaviva.records',
          )
        ).rows;
        const state: State = unpack(rows);
        const previous = new Map(
          rows.map((r) => [
            r.kind + ':' + r.key,
            JSON.stringify([r.data, r.position]),
          ]),
        );
        state.session = session.user_id;
        state.guestKey = session.guest_key;
        const before = structuredClone(state.credentials);
        const result = await action(state);
        if (write) {
          // Password changes revoke every session of that user, including other devices.
          for (const id of Object.keys(before))
            if (before[id].hash !== state.credentials[id]?.hash)
              await client.query(
                'DELETE FROM casaviva.sessions WHERE user_id=$1',
                [id],
              );
          if (state.session !== session.user_id) {
            this.nextToken = newToken();
            await client.query(
              'DELETE FROM casaviva.sessions WHERE token_hash=$1',
              [digest(this.token)],
            );
            await client.query(
              "INSERT INTO casaviva.sessions VALUES ($1,$2,$3,now()+interval '7 days',now())",
              [digest(this.nextToken), state.session, 'guest:' + newToken()],
            );
          }
          state.session = null;
          delete state.guestKey;
          for (const row of pack(state)) {
            const key = row.kind + ':' + row.key;
            if (previous.get(key) !== JSON.stringify([row.data, row.position]))
              await client.query(
                'INSERT INTO casaviva.records(kind,key,data,position) VALUES ($1,$2,$3,$4) ON CONFLICT(kind,key) DO UPDATE SET data=excluded.data, position=excluded.position, updated_at=now()',
                [row.kind, row.key, JSON.stringify(row.data), row.position],
              );
            previous.delete(key);
          }
          for (const row of rows)
            if (previous.has(row.kind + ':' + row.key))
              await client.query(
                'DELETE FROM casaviva.records WHERE kind=$1 AND key=$2',
                [row.kind, row.key],
              );
        }
        await client.query('COMMIT');
        return result;
      } catch (e) {
        await client.query('ROLLBACK');
        this.nextToken = null;
        if (
          attempt < 4 &&
          ['40001', '40P01'].includes((e as { code?: string }).code || '')
        )
          continue;
        throw e;
      } finally {
        client.release();
      }
    }
  }
}
export async function sessionToken(pool: pg.Pool, raw: string | undefined) {
  if (raw && /^[a-f0-9]{64}$/.test(raw)) {
    const existing = await pool.query(
      'SELECT 1 FROM casaviva.sessions WHERE token_hash=$1 AND expires_at>now()',
      [digest(raw)],
    );
    if (existing.rowCount) return { token: raw, fresh: false };
  }
  const token = newToken();
  await pool.query(
    "INSERT INTO casaviva.sessions VALUES ($1,NULL,$2,now()+interval '7 days',now())",
    [digest(token), 'guest:' + newToken()],
  );
  return { token, fresh: true };
}
export async function limit(pool: pg.Pool, key: string, max: number) {
  const result = await pool.query(
    `INSERT INTO casaviva.rate_limits VALUES ($1,1,now()+interval '15 minutes')
    ON CONFLICT (key) DO UPDATE SET count=CASE WHEN casaviva.rate_limits.expires_at<now() THEN 1 ELSE casaviva.rate_limits.count+1 END,
    expires_at=CASE WHEN casaviva.rate_limits.expires_at<now() THEN now()+interval '15 minutes' ELSE casaviva.rate_limits.expires_at END RETURNING count`,
    [digest(key)],
  );
  if (result.rows[0].count > max)
    throw new DomainError(
      'Demasiados intentos. Espera unos minutos.',
      'rate-limit',
    );
}
