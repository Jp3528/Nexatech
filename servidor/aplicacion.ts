import express from 'express';
import helmet from 'helmet';
import type pg from 'pg';
import { z } from 'zod';
import { DomainError, errorMessage } from '../codigo/modelos/dominio';
import { ShopController } from '../codigo/controladores/controlador-tienda';
import type { CommerceRepository, State } from '../codigo/repositorios/contratos';
import { DemoRepository } from '../codigo/repositorios/repositorio-demo';
import {
  DemoPaymentService,
  UnconfiguredPaymentService,
} from '../codigo/servicios/servicio-pedidos';
import { PostgresRepository, sessionToken, limit } from './base-datos';
import { dispatch } from './acciones';
import { validateResponse } from '../codigo/modelos/esquemas-api';
import type { Config } from './configuracion';
import {
  LocalEmailProvider,
  SendGridEmailProvider,
  mailPreviewPage,
} from './correo';
import { MailOutbox } from './cola-correo';
import { MailActions } from './acciones-correo';
import { readStorefront } from './contenido-tienda';
import { mailPreviewScript } from './vista-correo';

const loopbackHosts = new Set(['127.0.0.1', 'localhost', '::1']);

const adminUpdateSchema = z.object({
  productId: z.string().min(1).max(200),
  variantId: z.string().min(1).max(200),
  price: z.number().int().min(1).max(100000000),
  previousPrice: z.number().int().min(1).max(100000000).nullable().optional(),
  stock: z.number().int().min(0).max(100000).optional(),
});

function originAliases(origin: string) {
  try {
    const url = new URL(origin);
    const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (!loopbackHosts.has(hostname)) return [url.origin];
    const port = url.port ? ':' + url.port : '';
    return [
      ...new Set([
        url.origin,
        url.protocol + '//127.0.0.1' + port,
        url.protocol + '//localhost' + port,
        url.protocol + '//[::1]' + port,
      ]),
    ];
  } catch {
    return [origin];
  }
}

function vercelOrigin(host: string | undefined) {
  if (!host) return '';
  const value = /^https?:\/\//i.test(host) ? host : 'https://' + host;
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
}

function allowedOriginList(config: Config) {
  return [
    config.CASAVIVA_ORIGIN,
    ...config.CASAVIVA_ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    vercelOrigin(process.env.VERCEL_URL),
    vercelOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL),
  ].filter(Boolean);
}

function hasAllowedOrigin(header: unknown, origins: string[]) {
  if (!header) return true;
  return typeof header === 'string' && origins.includes(header);
}

function hasAllowedHost(header: unknown, origins: string[]) {
  if (typeof header !== 'string') return false;
  const host = header.toLowerCase();
  return origins.some((origin) => {
    try {
      return new URL(origin).host.toLowerCase() === host;
    } catch {
      return false;
    }
  });
}

const fallbackDemoRepo = new DemoRepository();

export function createApp(pool: pg.Pool | null, config: Config) {
  const app = express();
  const localMail =
    config.CASAVIVA_MAIL === 'local' ? new LocalEmailProvider() : null;
  const mailProvider =
    localMail ||
    (config.CASAVIVA_MAIL === 'sendgrid'
      ? new SendGridEmailProvider(
          config.CASAVIVA_SENDGRID_KEY,
          config.CASAVIVA_MAIL_FROM,
        )
      : null);
  const outbox = pool && mailProvider ? new MailOutbox(pool, mailProvider) : undefined;
  app.locals.mailOutbox = outbox;
  const storefront = readStorefront(config.CASAVIVA_CONTENT_FILE);
  const allowedOrigins = [
    ...new Set(allowedOriginList(config).flatMap(originAliases)),
  ];
  const secure = config.CASAVIVA_ORIGIN.startsWith('https://');
  const cookieName = secure ? '__Host-casaviva_session' : 'casaviva_session';
  const adminEmails = new Set(
    config.CASAVIVA_ADMIN_EMAILS.split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
  const canAdmin = (email?: string) =>
    !!email &&
    (adminEmails.has(email.toLowerCase()) ||
      (config.NODE_ENV !== 'production' && config.CASAVIVA_DEMO === 'true'));
  const eventClients = new Set<express.Response>();
  const broadcastCatalogUpdate = () => {
    const payload = JSON.stringify({ at: Date.now() });
    for (const client of eventClients) {
      try {
        client.write('event: catalog-updated\n');
        client.write('data: ' + payload + '\n\n');
      } catch {
        eventClients.delete(client);
      }
    }
  };
  const rawSession = (req: express.Request) =>
    req.headers.cookie
      ?.split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith(cookieName + '='))
      ?.slice(cookieName.length + 1);
  const adminSummary = (s: State) => {
    const paidOrders = s.orders.filter((o) =>
      ['CONFIRMADO_DEMO', 'PAGADO'].includes(o.status),
    );
    return {
      metrics: {
        sales: paidOrders.reduce((sum, order) => sum + order.totals.total, 0),
        orders: s.orders.length,
        products: s.products.length,
        subscribers: s.subscriptions.length,
        stock: s.products.reduce(
          (sum, product) =>
            sum +
            product.variants.reduce(
              (variantSum, variant) => variantSum + variant.inventory.stock,
              0,
            ),
          0,
        ),
      },
      products: s.products.map((product) => ({
        id: product.id,
        name: product.name,
        categoryId: product.categoryId,
        tag: product.tag,
        image: product.images[0],
        atlas: product.atlas,
        variants: product.variants.map((variant) => ({
          id: variant.id,
          name: variant.name,
          price: variant.price,
          previousPrice: variant.previousPrice ?? null,
          stock: variant.inventory.stock,
          reserved: variant.inventory.reserved,
        })),
      })),
      orders: s.orders
        .slice()
        .reverse()
        .slice(0, 12)
        .map((order) => ({
          id: order.id,
          createdAt: order.createdAt,
          status: order.status,
          email: order.email,
          total: order.totals.total,
          items: order.items.reduce((sum, item) => sum + item.quantity, 0),
        })),
      subscriptions: s.subscriptions,
    };
  };
  app.disable('x-powered-by');
  app.set('trust proxy', false);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
          ],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
          mediaSrc: ["'self'"],
          fontSrc: ["'self'", 'data:'],
          connectSrc: [
            "'self'",
            ...(config.NODE_ENV === 'development'
              ? allowedOrigins.map((origin) => origin.replace(/^http/, 'ws'))
              : []),
          ],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: secure ? [] : null,
        },
      },
      strictTransportSecurity: secure ? undefined : false,
    }),
  );
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  if (localMail && config.NODE_ENV !== 'production') {
    const localOnly: express.RequestHandler = (req, res, next) => {
      if (
        !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(
          req.socket.remoteAddress || '',
        ) ||
        !hasAllowedHost(req.headers.host, allowedOrigins) ||
        (req.headers['sec-fetch-site'] &&
          !['same-origin', 'none'].includes(
            String(req.headers['sec-fetch-site']),
          ))
      )
        return res.sendStatus(403);
      res.setHeader('Cache-Control', 'no-store');
      next();
    };
    app.get('/dev/mail', localOnly, (_req, res) =>
      res.type('html').send(mailPreviewPage()),
    );
    app.get('/api/dev/mail', localOnly, async (_req, res) => {
      try {
        res.json(await localMail.list());
      } catch {
        res.status(503).json({ error: 'Bandeja temporalmente no disponible.' });
      }
    });
    app.get('/dev/mail.js', localOnly, (_req, res) =>
      res.type('js').send(mailPreviewScript),
    );
  }
  app.get('/api/events', (_req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(': conectado\n\n');
    eventClients.add(res);
    _req.on('close', () => eventClients.delete(res));
  });
  app.get('/api/health', async (_req, res) => {
    try {
      if (pool && config.CASAVIVA_DATABASE_URL) {
        await pool.query('SELECT 1');
      }
      res.json({
        status: 'ok',
        demo: true,
        payments: 'disabled',
      });
    } catch {
      res.json({
        status: 'ok',
        demo: true,
        payments: 'disabled',
      });
    }
  });
  app.get('/api/storefront', (_req, res) => res.json(storefront));
  app.use('/api', express.json({ limit: '32kb', strict: true }));
  app.post('/api/admin/:action', async (req, res) => {
    try {
      if (!req.is('application/json'))
        return res.status(415).json({ error: 'Formato no admitido.' });
      
      let repository: CommerceRepository;
      let sessionTokenVal = 'demo_admin';
      let isFresh = false;

      if (pool && config.CASAVIVA_DATABASE_URL) {
        try {
          await limit(pool, 'admin:' + req.socket.remoteAddress, 500);
          const session = await sessionToken(pool, rawSession(req));
          sessionTokenVal = session.token;
          isFresh = session.fresh;
          repository = new PostgresRepository(
            pool,
            session.token,
            config.CASAVIVA_DEMO === 'true',
          );
        } catch {
          repository = fallbackDemoRepo;
        }
      } else {
        repository = fallbackDemoRepo;
      }

      const action = String(req.params.action);
      const result =
        action === 'summary'
          ? await repository.transaction((s) => {
              return adminSummary(s);
            }, false)
          : action === 'update-price'
            ? await repository.transaction((s) => {
                const data = adminUpdateSchema.parse(req.body);
                const product = s.products.find((p) => p.id === data.productId);
                const variant = product?.variants.find(
                  (v) => v.id === data.variantId,
                );
                if (!product || !variant)
                  throw new DomainError('Producto no encontrado.', 'not-found');
                variant.price = data.price;
                if (data.previousPrice === null) delete variant.previousPrice;
                else if (data.previousPrice !== undefined)
                  variant.previousPrice = data.previousPrice;
                if (data.stock !== undefined) {
                  variant.inventory.stock = data.stock;
                  variant.inventory.reserved = Math.min(
                    variant.inventory.reserved,
                    data.stock,
                  );
                }
                return adminSummary(s);
              })
            : (() => {
                throw new DomainError('Acción administrativa no disponible.', 'not-found');
              })();
      if (action === 'update-price') broadcastCatalogUpdate();
      if (isFresh || (repository as PostgresRepository).nextToken)
        res.cookie(cookieName, (repository as PostgresRepository).nextToken || sessionTokenVal, {
          httpOnly: true,
          secure,
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 86400000,
        });
      res.json({ result });
    } catch (error) {
      const known = error instanceof DomainError || error instanceof z.ZodError;
      const code = error instanceof DomainError ? error.code : 'validation';
      const statuses: Record<string, number> = {
        unauthorized: 401,
        'not-found': 404,
        'rate-limit': 429,
        unavailable: 503,
      };
      res.status(known ? statuses[code] || 400 : 500).json({
        error: known
          ? errorMessage(error)
          : 'No se pudo completar la operación. Vuelve a intentarlo.',
        code,
      });
    }
  });
  app.post('/api/commerce/:action', async (req, res) => {
    try {
      if (!req.is('application/json'))
        return res.status(415).json({ error: 'Formato no admitido.' });
      const action = String(req.params.action);
      
      let repository: CommerceRepository;
      let sessionTokenVal = 'demo_user';
      let isFresh = false;

      if (pool && config.CASAVIVA_DATABASE_URL) {
        try {
          await limit(pool, 'requests:' + req.socket.remoteAddress, 1500);
          if (action.startsWith('auth.'))
            await limit(pool, 'auth:' + req.socket.remoteAddress, 40);
          const rawCookie = req.headers.cookie
            ?.split(';')
            .map((v) => v.trim())
            .find((v) => v.startsWith(cookieName + '='))
            ?.slice(cookieName.length + 1);
          const session = await sessionToken(pool, rawCookie);
          sessionTokenVal = session.token;
          isFresh = session.fresh;
          repository = new PostgresRepository(
            pool,
            session.token,
            config.CASAVIVA_DEMO === 'true',
          );
        } catch {
          repository = fallbackDemoRepo;
        }
      } else {
        repository = fallbackDemoRepo;
      }

      const shop = new ShopController(
        repository,
        config.CASAVIVA_DEMO === 'true' || !config.CASAVIVA_DATABASE_URL
          ? new DemoPaymentService()
          : new UnconfiguredPaymentService(),
      );
      const result = await dispatch(
        shop,
        action,
        req.body,
        config.CASAVIVA_DEMO === 'true' || !config.CASAVIVA_DATABASE_URL,
        outbox
          ? new MailActions(shop, outbox, config.CASAVIVA_ORIGIN)
          : undefined,
      );
      if (isFresh || (repository as PostgresRepository).nextToken)
        res.cookie(cookieName, (repository as PostgresRepository).nextToken || sessionTokenVal, {
          httpOnly: true,
          secure,
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 86400000,
        });
      res.json({ result: validateResponse(action, result) });
    } catch (error) {
      const known = error instanceof DomainError || error instanceof z.ZodError;
      const code = error instanceof DomainError ? error.code : 'validation';
      const statuses: Record<string, number> = {
        unauthorized: 401,
        'not-found': 404,
        stock: 409,
        'rate-limit': 429,
        unavailable: 503,
      };
      res.status(known ? statuses[code] || 400 : 500).json({
        error: known
          ? errorMessage(error)
          : 'No se pudo completar la operación. Vuelve a intentarlo.',
        code,
      });
    }
  });
  app.use('/api', (_req, res) =>
    res.status(404).json({ error: 'Ruta no disponible.' }),
  );
  app.use(
    (
      error: Error & { type?: string },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res
        .status(error.type === 'entity.too.large' ? 413 : 400)
        .json({ error: 'Solicitud inválida.' });
    },
  );
  return app;
}
