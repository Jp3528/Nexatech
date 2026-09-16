import { normalize, type Product } from './dominio';
export const productSlug = (p: Product) =>
  normalize(p.name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') +
  '-' +
  p.id;
export const productPath = (p: Product) => '/producto/' + productSlug(p);
export function metadata(path: string, product?: Product) {
  const titles: Record<string, string> = {
    '/': 'Tecnología para tu setup',
    '/productos': 'Catálogo tech completo',
    '/catalogo': 'Catálogo tech completo',
    '/buscar': 'Busca tu próximo equipo',
    '/carrito': 'Tu carrito',
    '/checkout': 'Finaliza tu pedido',
    '/login': 'Inicia sesión',
    '/registro': 'Crea tu cuenta',
    '/cuenta': 'Tu espacio personal',
    '/cuenta/pedidos': 'Mis pedidos',
    '/cuenta/favoritos': 'Tus favoritos',
  };
  const title =
    product?.name ||
    titles[path] ||
    (path.startsWith('/categoria/')
      ? 'Selección de ' + path.split('/')[2]
      : 'Tu espacio NexaTech');
  return {
    title: title + ' | NexaTech',
    description:
      product?.description ||
      'Compra laptops, smartphones, audio, gaming, smart home y accesorios seleccionados. NexaTech: tecnología para tu setup.',
  };
}
