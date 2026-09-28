import { z } from 'zod';

function vercelOrigin(env: NodeJS.ProcessEnv) {
  const host = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  if (!host) return undefined;
  const value = /^https?:\/\//i.test(host) ? host : 'https://' + host;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const runningOnVercel = Boolean(
    env.VERCEL || env.VERCEL_URL || env.VERCEL_PROJECT_PRODUCTION_URL,
  );
  const defaultOrigin =
    vercelOrigin(env) ||
    (env.NODE_ENV === 'production' ? '' : 'http://127.0.0.1:3024');
  const dbUrl = env.CASAVIVA_DATABASE_URL || env.POSTGRES_URL || env.DATABASE_URL || '';
  const demoDefault = dbUrl ? 'false' : 'true';

  const schema = z.object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    CASAVIVA_DATABASE_URL: z.string().default(dbUrl),
    CASAVIVA_ORIGIN: z
      .string()
      .default(defaultOrigin),
    CASAVIVA_ALLOWED_ORIGINS: z.string().default(''),
    CASAVIVA_PORT: z.coerce.number().int().min(1).max(65535).default(3024),
    CASAVIVA_DEMO: z.enum(['true', 'false']).default(demoDefault),
    CASAVIVA_MAIL: z
      .enum(['disabled', 'local', 'sendgrid'])
      .default('disabled'),
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
  if (!config.CASAVIVA_ORIGIN)
    throw new Error('CASAVIVA_ORIGIN debe estar configurado.');
  if (!config.CASAVIVA_DATABASE_URL && !runningOnVercel)
    throw new Error('CASAVIVA_DATABASE_URL debe estar configurado.');
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
