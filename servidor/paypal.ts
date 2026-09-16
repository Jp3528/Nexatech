import { z } from 'zod';
import { DomainError } from '../codigo/modelos/dominio';
const identity = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const paypalOrder = z.object({
  id: identity,
  status: z.string(),
  links: z.array(z.object({ rel: z.string(), href: z.url() })).optional(),
  purchase_units: z
    .array(
      z.object({
        custom_id: z.string().optional(),
        payments: z
          .object({
            captures: z.array(
              z.object({
                id: identity,
                status: z.string(),
                amount: z.object({
                  value: z.string(),
                  currency_code: z.string(),
                }),
              }),
            ),
          })
          .optional(),
      }),
    )
    .optional(),
});
export interface PayPalSettings {
  clientId: string;
  secret: string;
  webhookId: string;
  live: boolean;
  origin: string;
}
export class PayPalProvider {
  constructor(
    private config: PayPalSettings,
    private request: typeof fetch = fetch,
  ) {}
  private get base() {
    return this.config.live
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }
  private async api(
    path: string,
    method = 'GET',
    body?: unknown,
    key?: string,
  ) {
    const auth = await this.request(this.base + '/v1/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(this.config.clientId + ':' + this.config.secret).toString(
            'base64',
          ),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(15000),
    });
    if (!auth.ok)
      throw new DomainError(
        'No se pudo autenticar con PayPal. No se ha confirmado el pago.',
        'payment',
      );
    const token = z
      .object({ access_token: z.string().min(1) })
      .parse(await auth.json()).access_token;
    const res = await this.request(this.base + path, {
      method,
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        ...(key ? { 'PayPal-Request-Id': key } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok)
      throw new DomainError(
        'PayPal no pudo completar la solicitud. Puedes reintentar sin crear otro pedido.',
        'payment',
      );
    return res.json();
  }
  async create(id: string, amount: number, currency: string) {
    if (currency !== 'USD')
      throw new DomainError(
        'La moneda de PayPal requiere configuración.',
        'unavailable',
      );
    const order = paypalOrder.parse(
      await this.api(
        '/v2/checkout/orders',
        'POST',
        {
          intent: 'CAPTURE',
          purchase_units: [
            {
              custom_id: id,
              invoice_id: id,
              amount: {
                currency_code: currency,
                value: (amount / 100).toFixed(2),
              },
            },
          ],
          payment_source: {
            paypal: {
              experience_context: {
                user_action: 'PAY_NOW',
                return_url:
                  this.config.origin +
                  '/pago/retorno?pedido=' +
                  encodeURIComponent(id),
                cancel_url:
                  this.config.origin + '/pedido/' + encodeURIComponent(id),
              },
            },
          },
        },
        id,
      ),
    );
    const approval = order.links?.find(
      (l) => l.rel === 'payer-action' || l.rel === 'approve',
    )?.href;
    if (!approval || !this.isApprovalUrl(approval))
      throw new DomainError('Respuesta de PayPal inválida.', 'payment');
    return { reference: order.id, approvalUrl: approval };
  }
  isApprovalUrl(value: string) {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname ===
        (this.config.live ? 'www.paypal.com' : 'www.sandbox.paypal.com')
    );
  }
  async capture(reference: string, key: string) {
    identity.parse(reference);
    const existing = paypalOrder.parse(
      await this.api('/v2/checkout/orders/' + reference),
    );
    return existing.status === 'COMPLETED'
      ? existing
      : paypalOrder.parse(
          await this.api(
            '/v2/checkout/orders/' + reference + '/capture',
            'POST',
            {},
            key,
          ),
        );
  }
  async details(reference: string) {
    identity.parse(reference);
    return paypalOrder.parse(
      await this.api('/v2/checkout/orders/' + reference),
    );
  }
  async verify(headers: Record<string, string | undefined>, event: unknown) {
    if (!this.config.webhookId)
      throw new DomainError('Webhook pendiente de configurar.', 'unavailable');
    const names = [
      'paypal-auth-algo',
      'paypal-cert-url',
      'paypal-transmission-id',
      'paypal-transmission-sig',
      'paypal-transmission-time',
    ];
    if (names.some((n) => !headers[n] || headers[n]!.length > 1000))
      return false;
    const result = z
      .object({ verification_status: z.string() })
      .parse(
        await this.api('/v1/notifications/verify-webhook-signature', 'POST', {
          auth_algo: headers[names[0]],
          cert_url: headers[names[1]],
          transmission_id: headers[names[2]],
          transmission_sig: headers[names[3]],
          transmission_time: headers[names[4]],
          webhook_id: this.config.webhookId,
          webhook_event: event,
        }),
      );
    return result.verification_status === 'SUCCESS';
  }
}
