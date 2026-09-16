import { z } from 'zod';
export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const schema = z.object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    CASAVIVA_DATABASE_URL: z.string().min(1),
    CASAVIVA_ORIGIN: z.url().default('http://127.0.0.1:3024'),
    CASAVIVA_PORT: z.coerce.number().int().min(1).max(65535).default(3024),
    CASAVIVA_DEMO: z.enum(['true', 'false']).default('false'),
    CASAVIVA_MAIL: z
      .enum(['disabled', 'local', 'sendgrid'])
      .default(env.NODE_ENV === 'production' ? 'disabled' : 'local'),
    CASAVIVA_MAIL_FROM: z.string().default(''),
    CASAVIVA_SENDGRID_KEY: z.string().default(''),
    CASAVIVA_PAYPAL_CLIENT_ID: z.string().default(''),
    CASAVIVA_PAYPAL_SECRET: z.string().default(''),
    CASAVIVA_PAYPAL_WEBHOOK_ID: z.string().default(''),
    CASAVIVA_PAYPAL_LIVE: z.enum(['true', 'false']).default('false'),
    CASAVIVA_PAYPAL_PEN_PER_USD: z.coerce.number().nonnegative().default(0),
    CASAVIVA_INDEXABLE: z.enum(['true', 'false']).default('false'),
    CASAVIVA_CONTENT_FILE: z.string().default('configuracion/contenido-tienda.json'),
    CASAVIVA_ADMIN_EMAILS: z.string().default(''),
  });
  const parsed = schema.safeParse(env);
  if (!parsed.success)
    throw new Error(
      'Configuración inválida. Revisa variables-entorno.ejemplo; no se mostrarán valores sensibles.',
    );
  const config = parsed.data;
  if (
    config.CASAVIVA_MAIL === 'sendgrid' &&
    (!config.CASAVIVA_SENDGRID_KEY ||
      !z.email().safeParse(config.CASAVIVA_MAIL_FROM).success)
  )
    throw new Error(
      'Configura el remitente verificado y la clave privada del proveedor de correo.',
    );
  if (config.NODE_ENV === 'production' && config.CASAVIVA_MAIL === 'local')
    throw new Error('El correo local es exclusivo de desarrollo y pruebas.');
  if (
    config.NODE_ENV === 'production' &&
    !config.CASAVIVA_ORIGIN.startsWith('https://')
  )
    throw new Error('Producción requiere CASAVIVA_ORIGIN con HTTPS.');
  if (new URL(config.CASAVIVA_ORIGIN).origin !== config.CASAVIVA_ORIGIN)
    throw new Error('CASAVIVA_ORIGIN debe contener solo el origen, sin rutas.');
  return config;
}
export type Config = ReturnType<typeof readConfig>;

