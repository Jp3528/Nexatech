import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { DomainError } from '../codigo/modelos/dominio';
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  key: string;
}
export interface EmailProvider {
  send(message: MailMessage): Promise<void>;
}
const messageSchema = z.object({
  to: z.email(),
  subject: z.string().min(1).max(200),
  text: z.string().max(20000),
  key: z.string().min(1).max(200),
});
export class LocalEmailProvider implements EmailProvider {
  constructor(private directory = resolve('.local-private/mail')) {}
  async send(input: MailMessage) {
    const message = messageSchema.parse(input);
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const name = createHash('sha256').update(message.key).digest('hex');
    try {
      await writeFile(
        resolve(this.directory, name + '.json'),
        JSON.stringify(
          { ...message, createdAt: new Date().toISOString() },
          null,
          2,
        ),
        { flag: 'wx', mode: 0o600 },
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
    }
  }
  async list() {
    await mkdir(this.directory, { recursive: true });
    const files = (await readdir(this.directory)).filter((f) =>
      /^[a-f0-9]{64}\.json$/.test(f),
    );
    return Promise.all(
      files
        .slice(-100)
        .map(async (f) =>
          JSON.parse(await readFile(resolve(this.directory, f), 'utf8')),
        ),
    );
  }
}
export class SendGridEmailProvider implements EmailProvider {
  constructor(
    private key: string,
    private from: string,
    private request: typeof fetch = fetch,
  ) {}
  async send(input: MailMessage) {
    const message = messageSchema.parse(input);
    const res = await this.request('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: z.email().parse(this.from) },
        subject: message.subject,
        content: [{ type: 'text/plain', value: message.text }],
        custom_args: { nexatech_key: message.key },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok)
      throw new DomainError(
        'El proveedor de correo no aceptó el envío.',
        'mail',
      );
  }
}
export function mailPreviewPage() {
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Correo local · NexaTech</title><style>body{font:16px system-ui;background:#f8fafc;color:#172033;max-width:900px;margin:40px auto;padding:20px}article{background:#e0f2fe;padding:24px;margin:18px 0;overflow-wrap:anywhere}pre{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#0ea5e9}</style><h1>Correo local NexaTech</h1><p>Bandeja local del sistema. Conecta un proveedor externo para entregar estos mensajes por Internet.</p><div id="messages"></div><script src="/dev/mail.js"></script></html>`;
}
