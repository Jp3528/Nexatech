import { existsSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { z } from 'zod';
import type pg from 'pg';
import { productDto } from '../codigo/modelos/esquemas-api';
import { categories } from '../codigo/datos/datos-demo';
export const catalogSchema = z
  .object({
    approved: z.literal(true),
    products: z.array(productDto).min(1).max(10000),
  })
  .strict()
  .superRefine((data, ctx) => {
    const ids = new Set<string>(),
      variants = new Set<string>();
    for (const p of data.products) {
      if (
        ids.has(p.id) ||
        !categories.some((c) => c.id === p.categoryId) ||
        p.atlas !== undefined ||
        p.reviews.some((r) => r.demo) ||
        JSON.stringify(p).includes('[DATO PENDIENTE]')
      )
        ctx.addIssue({
          code: 'custom',
          message:
            'Revisa IDs, categorías, fotografías y contenido real del catálogo.',
        });
      ids.add(p.id);
      for (const v of p.variants) {
        if (
          variants.has(v.id) ||
          v.inventory.reserved !== 0 ||
          v.price <= 0 ||
          (v.previousPrice !== undefined && v.previousPrice <= v.price)
        )
          ctx.addIssue({
            code: 'custom',
            message: 'Variante duplicada, reserva manual o precio inválido.',
          });
        variants.add(v.id);
      }
    }
  });
export async function importCatalog(pool: pg.Pool, input: unknown) {
  const data = catalogSchema.parse(input),
    root = resolve('publico');
  for (const p of data.products)
    for (const image of p.images) {
      const target = resolve(root, '.' + image);
      if (!target.startsWith(root + sep) || !existsSync(target))
        throw new Error('Falta una imagen local del catálogo.');
    }
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    const mode = (
      await client.query('SELECT demo FROM casaviva.store WHERE id=1')
    ).rows[0];
    if (!mode || mode.demo)
      throw new Error(
        'La importación real requiere una base separada en modo real.',
      );
    const existing = (
      await client.query(
        "SELECT data FROM casaviva.records WHERE kind='products' FOR UPDATE",
      )
    ).rows.map((r) => productDto.parse(r.data));
    const variants = new Map(
      existing.flatMap((p) =>
        p.variants.map((v) => [v.id, { product: p.id, variant: v }] as const),
      ),
    );
    for (const [position, p] of data.products.entries()) {
      const old = existing.find((v) => v.id === p.id);
      if (old?.variants.some((v) => !p.variants.some((n) => n.id === v.id)))
        throw new Error(
          'No se eliminan variantes existentes mediante importación.',
        );
      for (const v of p.variants) {
        const current = variants.get(v.id);
        if (current && current.product !== p.id)
          throw new Error('Una variante pertenece a otro producto.');
        v.inventory.reserved = current?.variant.inventory.reserved || 0;
        if (v.inventory.stock < v.inventory.reserved)
          throw new Error('El stock no puede ser menor a las reservas.');
      }
      await client.query(
        "INSERT INTO casaviva.records(kind,key,data,position) VALUES('products',$1,$2,$3) ON CONFLICT(kind,key) DO UPDATE SET data=excluded.data,updated_at=now()",
        [p.id, JSON.stringify(p), existing.length + position],
      );
    }
    await client.query('COMMIT');
    return data.products.length;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
export function readCatalog(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'));
}
