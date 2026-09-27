import type { ShopController } from './controlador-tienda';
import { DomainError } from '../modelos/dominio';
import { validateResponse } from '../modelos/esquemas-api';
// Only this HTTP boundary is shipped to the View. All mutations run on the server.
type ApiBody = {
  error?: unknown;
  code?: unknown;
  result?: unknown;
};

function asApiBody(value: unknown): ApiBody {
  return value && typeof value === 'object' ? (value as ApiBody) : {};
}

async function call<T>(action: string, args: unknown[] = []): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api/commerce/' + action, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ args }),
      signal: AbortSignal.timeout(25000),
    });
  } catch {
    throw new DomainError(
      'No se pudo conectar. Comprueba tu conexión y vuelve a intentarlo.',
      'network',
    );
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new DomainError(
      'La API no respondió correctamente. Revisa el despliegue del backend en Vercel.',
      'unavailable',
    );
  }
  const body = asApiBody(await response.json());
  if (!response.ok)
    throw new DomainError(
      typeof body.error === 'string'
        ? body.error
        : 'No se pudo completar la operación.',
      typeof body.code === 'string' ? body.code : 'unavailable',
    );
  return validateResponse(action, body.result) as T;
}
type Port = Pick<
  ShopController,
  'snapshot' | 'auth' | 'cart' | 'products' | 'orders' | 'email'
>;
type PublicService<T> = { [K in keyof T]: T[K] };
function service<T>(name: string, methods: string[]): PublicService<T> {
  return Object.fromEntries(
    methods.map((method) => [
      method,
      (...args: unknown[]) => call(name + '.' + method, args),
    ]),
  ) as PublicService<T>;
}
export const shop = {
  snapshot: () => call<Awaited<ReturnType<Port['snapshot']>>>('snapshot'),
  auth: service<Port['auth']>('auth', [
    'register',
    'login',
    'logout',
    'profile',
    'address',
    'removeAddress',
    'recover',
    'reset',
  ]),
  cart: service<Port['cart']>('cart', ['change', 'coupon', 'favorite']),
  products: service<Port['products']>('products', ['list', 'detail']),
  orders: service<Port['orders']>('orders', ['checkout', 'list', 'detail']),
  email: service<Port['email']>('email', ['subscribe']),
};
