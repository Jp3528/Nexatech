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
  const defaultOrigin = vercelOrigin(env) || (env.NODE_ENV === 'production' ? 'https://nexatech-taupe.vercel.app' : 'http://127.0.0.1:3024');
  const dbUrl = env.CASAVIVA_DATABASE_URL || env.POSTGRES_URL || env.DATABASE_URL || '';

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
    CASAVIVA_DEMO: z.enum(['true', 'false']).default('true'),
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
  if (!parsed.success) {
    console.warn('Configuración parcial en NexaTech, usando valores seguros por defecto.');
    return {
      NODE_ENV: env.NODE_ENV === 'production' ? 'production' : 'development',
      CASAVIVA_DATABASE_URL: dbUrl,
      CASAVIVA_ORIGIN: defaultOrigin,
      CASAVIVA_ALLOWED_ORIGINS: '',
      CASAVIVA_PORT: 3024,
      CASAVIVA_DEMO: 'true' as const,
      CASAVIVA_MAIL: 'disabled' as const,
      CASAVIVA_MAIL_FROM: '',
      CASAVIVA_SENDGRID_KEY: '',
      CASAVIVA_PAYPAL_CLIENT_ID: '',
      CASAVIVA_PAYPAL_SECRET: '',
      CASAVIVA_PAYPAL_WEBHOOK_ID: '',
      CASAVIVA_PAYPAL_LIVE: 'false' as const,
      CASAVIVA_PAYPAL_PEN_PER_USD: 0,
      CASAVIVA_INDEXABLE: 'false' as const,
      CASAVIVA_CONTENT_FILE: 'configuracion/contenido-tienda.json',
      CASAVIVA_ADMIN_EMAILS: '',
    };
  }

  const config = parsed.data;
  return config;
}

export type Config = ReturnType<typeof readConfig>;
