import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalEmailProvider, SendGridEmailProvider } from '../servidor/correo';
import { PayPalProvider } from '../servidor/paypal';
import { PaymentCoordinator, PendingPayPal } from '../servidor/pagos';
import { DemoRepository } from '../codigo/repositorios/repositorio-demo';
import { ShopController } from '../codigo/controladores/controlador-tienda';
import { validateResponse } from '../codigo/modelos/esquemas-api';
await test('correo local privado e idempotente; no interpreta HTML', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'casaviva-mail-'));
  try {
    const provider = new LocalEmailProvider(dir);
    const message = {
      to: 'test@example.invalid',
      subject: '<script>prueba</script>',
      text: 'Mensaje local',
      key: 'same',
    };
    await Promise.all([provider.send(message), provider.send(message)]);
    const list = await provider.list();
    assert.equal(list.length, 1);
    assert.equal(list[0].subject, message.subject);
    await assert.rejects(provider.send({ ...message, to: 'inválido' }));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
await test('SendGrid usa contrato oficial y comunica rechazo sin revelar clave', async () => {
  const provider = new SendGridEmailProvider(
    'test-key',
    'test@example.invalid',
    async (url, init) => {
      assert.equal(url, 'https://api.sendgrid.com/v3/mail/send');
      assert.equal(init?.method, 'POST');
      assert.equal(typeof init?.body, 'string');
      assert.equal(
        JSON.parse(init!.body as string).personalizations[0].to[0].email,
        'client@example.invalid',
      );
      return new Response('', { status: 403 });
    },
  );
  await assert.rejects(
    provider.send({
      to: 'client@example.invalid',
      subject: 'Prueba',
      text: 'Prueba',
      key: 'one',
    }),
    /no aceptó/,
  );
});
await test('PayPal: creación idempotente, captura ya completada y firma rechazada', async () => {
  const calls: string[] = [];
  const provider = new PayPalProvider(
    {
      clientId: 'test',
      secret: 'test',
      webhookId: 'test',
      live: false,
      origin: 'http://127.0.0.1:3024',
    },
    async (url, init) => {
      const path =
        typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      calls.push(path);
      if (path.endsWith('/token'))
        return Response.json({ access_token: 'test-token' });
      if (path.endsWith('verify-webhook-signature'))
        return Response.json({ verification_status: 'FAILURE' });
      if (init?.method === 'POST') {
        assert.equal(
          new Headers(init.headers).get('PayPal-Request-Id'),
          'internal-id',
        );
        return Response.json({
          id: 'PAYPAL1',
          status: 'CREATED',
          links: [
            {
              rel: 'payer-action',
              href: 'https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL1',
            },
          ],
        });
      }
      return Response.json({ id: 'PAYPAL1', status: 'COMPLETED' });
    },
  );
  await assert.rejects(provider.create('internal-id', 1000, 'PEN'), /moneda/);
  assert.equal(
    (await provider.create('internal-id', 1000, 'USD')).reference,
    'PAYPAL1',
  );
  assert.equal(
    (await provider.capture('PAYPAL1', 'capture-id')).status,
    'COMPLETED',
  );
  assert.equal(
    calls.some((c) => c.endsWith('/capture')),
    false,
  );
  assert.equal(provider.isApprovalUrl('https://evil.invalid/checkout'), false);
  assert.equal(await provider.verify({}, {}), false);
  assert.equal(
    await provider.verify(
      Object.fromEntries(
        [
          'paypal-auth-algo',
          'paypal-cert-url',
          'paypal-transmission-id',
          'paypal-transmission-sig',
          'paypal-transmission-time',
        ].map((k) => [k, 'test']),
      ),
      {},
    ),
    false,
  );
});
await test('conciliación reserva stock, cobra una vez y valida estados', async () => {
  const repo = new DemoRepository(() => true, 0),
    shop = new ShopController(repo);
  await shop.auth.register({
    name: 'Prueba local',
    email: 'pay@example.invalid',
    password: 'SoloPruebas123!',
    consent: true,
  });
  await shop.cart.change('cv-0-natural', 1);
  const before = (await repo.read()).products[0].variants[0].inventory.stock;
  const provider = {
    create: async () => ({
      reference: 'REMOTE1',
      approvalUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=REMOTE1',
    }),
  } as unknown as PayPalProvider;
  const coordinator = new PaymentCoordinator(repo, provider, 4); // Test-only conversion; never production configuration.
  const order = await coordinator.checkout({
    key: crypto.randomUUID(),
    email: 'pay@example.invalid',
    method: 'PayPal',
    consent: true,
    address: {
      id: '',
      name: 'Prueba',
      street: 'Calle de prueba 123',
      department: 'Lima',
      city: 'Lima',
      district: 'Prueba',
      reference: '',
    },
  });
  assert.equal(order.status, 'PENDIENTE');
  assert.equal(
    (await repo.read()).products[0].variants[0].inventory.reserved,
    1,
  );
  const response = {
    id: 'REMOTE1',
    status: 'COMPLETED',
    purchase_units: [
      {
        custom_id: order.id,
        payments: {
          captures: [
            {
              id: 'CAPTURE1',
              status: 'COMPLETED',
              amount: {
                currency_code: 'USD',
                value: (order.payment.amount! / 100).toFixed(2),
              },
            },
          ],
        },
      },
    ],
  };
  const paid = await coordinator.reconcile(order, response);
  assert.equal(paid.status, 'PAGADO');
  await coordinator.reconcile(order, response);
  assert.equal(
    (await repo.read()).products[0].variants[0].inventory.stock,
    before - 1,
  );
  assert.throws(
    () => new PendingPayPal(0).confirm('PayPal', { amount: 100 }),
    /conversión/,
  );
  assert.throws(() =>
    validateResponse('orders.detail', {
      ...paid,
      payment: { ...paid.payment, status: 'FORGED' },
    }),
  );
  await shop.cart.change('cv-0-natural', 1);
  const expired = await coordinator.checkout({
    key: crypto.randomUUID(),
    email: order.email,
    method: 'PayPal',
    consent: true,
    address: order.address,
  });
  await repo.transaction((s) => {
    s.orders.find((o) => o.id === expired.id)!.expiresAt = Date.now() - 1;
  });
  assert.equal(await coordinator.expire(), 1);
  assert.equal(
    (await repo.read()).products[0].variants[0].inventory.reserved,
    0,
  );
  const late = structuredClone(response);
  late.purchase_units[0].custom_id = expired.id;
  assert.equal((await coordinator.reconcile(expired, late)).status, 'REVISION');
  assert.equal(
    (await repo.read()).products[0].variants[0].inventory.stock,
    before - 1,
  );
});
