import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus, X } from "lucide-react";
import { available, type Product, type Room, type RoomProduct } from "../modelos/dominio";
import { productPath } from "../modelos/metadatos-seo";
import { AddToCartButton, currency, Photo, Price } from "./interfaz";

type HotspotProduct = RoomProduct & {
  product: Product;
};

function productPrice(product: Product, variantId?: string) {
  const variant = product.variants.find((item) => item.id === variantId) || product.variants[0];
  return variant;
}

export function SalaInteractiva({ room, products }: { room: Room; products: Product[] }) {
  const [selectedId, setSelectedId] = useState("");
  const hotspots = useMemo<HotspotProduct[]>(() => {
    const productMap = new Map(products.map((product) => [product.id, product]));
    return room.products
      .map((item) => {
        const product = productMap.get(item.productId);
        return product ? { ...item, product } : undefined;
      })
      .filter((item): item is HotspotProduct => !!item)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [products, room.products]);
  const selected = hotspots.find((item) => item.id === selectedId);
  const selectedVariant = selected ? productPrice(selected.product, selected.variantId) : undefined;

  useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId("");
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [selected]);

  return (
    <section className="interactive-room" aria-label={room.title} data-room-slug={room.slug}>
      <div className="room-stage">
        <picture className="room-photo">
          <img
            src={room.image}
            alt={room.name + " NexaTech"}
            width={1600}
            height={900}
            loading="eager"
            decoding="async"
          />
        </picture>
        <div className="room-hint" aria-hidden="true">
          <span />
          Productos seleccionables
        </div>
        {hotspots.map((item) => {
          const variant = productPrice(item.product, item.variantId);
          return (
            <button
              key={item.id}
              type="button"
              className={
                "room-hotspot tooltip-" +
                (item.tooltipPosition || "top") +
                (item.id === selected?.id ? " active" : "")
              }
              style={{
                left: item.positionX + "%",
                top: item.positionY + "%",
              }}
              aria-label={"Ver " + item.product.name}
              aria-expanded={item.id === selected?.id}
              onClick={() => setSelectedId(item.id)}
            >
              <Plus size={18} aria-hidden="true" />
              <span className="room-tooltip" role="tooltip">
                <strong>{item.product.name}</strong>
                <small>{currency(variant.price)}</small>
              </span>
            </button>
          );
        })}
      </div>
      {selected && selectedVariant && (
        <aside className="room-quickview" aria-label={"Ficha rápida de " + selected.product.name}>
          <button
            type="button"
            className="room-quickview-close"
            aria-label="Cerrar ficha rápida"
            onClick={() => setSelectedId("")}
          >
            <X size={18} />
          </button>
          <div className="room-quickview-media">
            <Photo
              src={selected.product.images[0]}
              alt={selected.product.name}
              atlas={selected.product.atlas}
            />
          </div>
          <div className="room-quickview-copy">
            <p className="eyebrow">PRODUCTO DEL SETUP</p>
            <h2>{selected.product.name}</h2>
            <p>{selected.product.description}</p>
            <Price value={selectedVariant.price} previous={selectedVariant.previousPrice} />
            <small>
              {available(selectedVariant) > 0
                ? `${available(selectedVariant)} unidades disponibles`
                : "Producto agotado"}
            </small>
            <div className="room-quickview-actions">
              <a className="button light" href={productPath(selected.product)}>
                Ver producto <ArrowRight size={17} />
              </a>
              <AddToCartButton product={selected.product} variantId={selectedVariant.id} />
            </div>
          </div>
        </aside>
      )}
    </section>
  );
}
