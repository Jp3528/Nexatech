import { z } from 'zod';
export const informationTitles = [
  'Envíos',
  'Devoluciones',
  'Garantía',
  'Contacto',
  'Nuestra historia',
  'Privacidad',
  'Términos',
  'Redes sociales',
] as const;
export const storefrontSchema = z.object({
  approved: z.boolean(),
  company: z.string().min(1).max(500),
  contactEmail: z.union([z.email(), z.literal('[DATO PENDIENTE]')]),
  pages: z.record(z.enum(informationTitles), z.string().min(1).max(20000)),
});
export const pendingStorefront = storefrontSchema.parse({
  approved: false,
  company: '[DATO PENDIENTE]',
  contactEmail: '[DATO PENDIENTE]',
  pages: Object.fromEntries(
    informationTitles.map((t) => [t, '[DATO PENDIENTE]']),
  ),
});
export type Storefront = z.infer<typeof storefrontSchema>;
