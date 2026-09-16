import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrderStatus } from '../codigo/vistas/estado-pedido';
await test('pedido pendiente, cancelado o en revisión nunca se presenta como confirmado', () => {
  for (const status of ['PENDIENTE', 'CANCELADO', 'REVISION'] as const) {
    const html = renderToStaticMarkup(<OrderStatus status={status} />);
    assert.ok(!html.includes('<strong> Pago confirmado'));
    assert.ok(!html.includes('Pago confirmado'));
    assert.ok(!html.includes('Factura / recibo'));
    assert.match(html, /<output/);
  }
  assert.match(
    renderToStaticMarkup(<OrderStatus status="CONFIRMADO_DEMO" />),
    /comprobante de compra/,
  );
});

