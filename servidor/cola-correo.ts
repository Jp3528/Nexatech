import type pg from 'pg';
import type { EmailProvider, MailMessage } from './correo';
// Durable, at-least-once delivery. Provider errors never roll back a confirmed order.
export class MailOutbox implements EmailProvider {
  constructor(
    private pool: pg.Pool,
    private provider: EmailProvider,
  ) {}
  async send(message: MailMessage) {
    await this.pool.query(
      'INSERT INTO casaviva.mail_outbox(key,message) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [message.key, JSON.stringify(message)],
    );
  }
  async drain() {
    for (let i = 0; i < 20; i++) {
      const claimed = await this.pool
        .query(`UPDATE casaviva.mail_outbox SET attempts=attempts+1, available_at=now()+interval '2 minutes'
        WHERE key=(SELECT key FROM casaviva.mail_outbox WHERE sent_at IS NULL AND available_at<=now() AND attempts<8 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING key,message`);
      if (!claimed.rowCount) return;
      const row = claimed.rows[0];
      try {
        await this.provider.send(row.message);
        await this.pool.query(
          "UPDATE casaviva.mail_outbox SET sent_at=now(), message=jsonb_build_object('delivered',true) WHERE key=$1",
          [row.key],
        );
      } catch {
        console.error(
          'Correo pendiente: se reintentará desde la cola privada.',
        );
      }
    }
  }
}
