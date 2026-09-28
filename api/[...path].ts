import type { IncomingMessage, ServerResponse } from 'node:http';
import type express from 'express';
import type pg from 'pg';
import { createApp } from '../servidor/aplicacion';
import { createPool } from '../servidor/base-datos';
import { readConfig } from '../servidor/configuracion';

let appPromise: Promise<express.Express> | null = null;
let pool: pg.Pool | null = null;

function ensureApiPath(request: IncomingMessage) {
  const url = request.url || '/';
  if (url.startsWith('/api/')) return;
  request.url = '/api' + (url.startsWith('/') ? url : '/' + url);
}

async function app() {
  if (!appPromise) {
    appPromise = Promise.resolve().then(() => {
      const config = readConfig();
      if (config.CASAVIVA_DATABASE_URL) {
        try {
          pool = pool || createPool(config.CASAVIVA_DATABASE_URL);
        } catch {
          pool = null;
        }
      }
      return createApp(pool, config);
    });
  }
  return appPromise;
}

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 30,
};

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    ensureApiPath(request);
    const expressApp = await app();
    expressApp(request, response);
  } catch (error) {
    console.error(
      'Error en Serverless API NexaTech:',
      error instanceof Error ? error.message : error,
    );
    if (!response.headersSent) {
      response.statusCode = 500;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    response.end(
      JSON.stringify({
        error: 'No se pudo completar la operación en la API.',
        code: 'unavailable',
      }),
    );
  }
}
