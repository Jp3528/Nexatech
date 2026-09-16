import type { CommerceRepository } from '../repositorios/contratos';
import { productSlug } from '../modelos/metadatos-seo';
import {
  available,
  defaultQuery,
  DomainError,
  normalize,
  type Query,
} from '../modelos/dominio';
export class ProductService {
  constructor(private repository: CommerceRepository) {}
  async list(input: Partial<Query> = {}) {
    const q = { ...defaultQuery, ...input };
    const { products } = await this.repository.read();
    const found = products.filter(
      (p) =>
        (!q.q ||
          normalize(
            [
              p.name,
              p.categoryId,
              p.brand.name,
              p.material,
              p.description,
              p.tag,
              ...Object.values(p.specifications),
            ].join(' '),
          ).includes(normalize(q.q))) &&
        (!q.category || p.categoryId === q.category) &&
        (!q.brand || p.brand.id === q.brand) &&
        (!q.newOnly || p.tag === 'Nuevo') &&
        (!q.available || p.variants.some((v) => available(v) > 0)) &&
        (q.min === undefined ||
          Math.min(...p.variants.map((v) => v.price)) >= q.min * 100) &&
        (q.max === undefined ||
          Math.min(...p.variants.map((v) => v.price)) <= q.max * 100),
    );
    if (q.sort === 'name')
      found.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    if (q.sort.startsWith('price'))
      found.sort(
        (a, b) =>
          (Math.min(...a.variants.map((v) => v.price)) -
            Math.min(...b.variants.map((v) => v.price))) *
          (q.sort === 'price-asc' ? 1 : -1),
      );
    const pageSize = Math.max(1, Math.min(24, q.pageSize)),
      pages = Math.max(1, Math.ceil(found.length / pageSize)),
      page = Math.max(1, Math.min(pages, q.page));
    return {
      items: found.slice((page - 1) * pageSize, page * pageSize),
      total: found.length,
      page,
      pages,
    };
  }
  async detail(id: string) {
    const state = await this.repository.read();
    const product = state.products.find(
      (p) => p.id === id || productSlug(p) === id,
    );
    if (!product)
      throw new DomainError('No encontramos este producto.', 'not-found');
    return product;
  }
}
