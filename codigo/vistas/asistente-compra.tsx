import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  MessageCircle,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';
import { categories } from '../datos/datos-demo';
import { available, normalize, type Product } from '../modelos/dominio';
import { productPath } from '../modelos/metadatos-seo';
import { useShop } from '../controladores/usar-tienda';
import { currency, go } from './interfaz';

type AccionAsistente = {
  label: string;
  path: string;
};

type MensajeAsistente = {
  id: number;
  author: 'bot' | 'user';
  text: string;
  actions?: AccionAsistente[];
  products?: Product[];
};

const sugerencias = [
  'Quiero ver ofertas',
  '¿Cómo compro?',
  'Medios de pago',
  'Envíos y devoluciones',
  'Necesito una laptop',
];

function buscarProductos(texto: string, productos: Product[]) {
  const busqueda = normalize(texto);
  if (!busqueda) return [];
  const tokens = busqueda
    .split(/\s+/)
    .filter((token) => token.length > 2 && !['para', 'con', 'los', 'las'].includes(token));
  return productos
    .filter((producto) => {
      const categoria = categories.find((c) => c.id === producto.categoryId)?.name || '';
      const contenido = normalize(
        [
          producto.name,
          producto.brand.name,
          producto.material,
          producto.description,
          categoria,
          producto.tag,
        ].join(' '),
      );
      return tokens.some((token) => contenido.includes(token));
    })
    .slice(0, 3);
}

function responder(
  texto: string,
  productos: Product[],
  cantidadCarrito: number,
  totalCarrito: number,
): Omit<MensajeAsistente, 'id' | 'author'> {
  const consulta = normalize(texto);
  const categoria = categories.find(
    (c) => consulta.includes(normalize(c.name)) || consulta.includes(c.id),
  );
  const encontrados = buscarProductos(texto, productos);
  const ofertas = productos
    .filter((p) => p.variants.some((v) => v.previousPrice && v.previousPrice > v.price))
    .slice(0, 3);

  if (!consulta || /hola|buenas|ayuda|asesor|asistente/.test(consulta)) {
    return {
      text: 'Hola, soy el asistente de NexaTech. Puedo orientarte con productos, categorías, carrito, pagos, envíos, garantías y cambios.',
      actions: [
        { label: 'Ver catálogo', path: '/productos' },
        { label: 'Ir al carrito', path: '/carrito' },
      ],
    };
  }

  if (/precio|precios|cuesta|costo|valor|oferta|descuento|promocion/.test(consulta)) {
    if (encontrados.length) {
      return {
        text: 'Encontré estos productos relacionados. Los precios visibles salen del catálogo activo de NexaTech.',
        products: encontrados,
        actions: [{ label: 'Ver todos los productos', path: '/productos' }],
      };
    }
    return {
      text: ofertas.length
        ? 'Estas son algunas opciones con descuento disponibles en el catálogo.'
        : 'Los precios se muestran en cada tarjeta y en el detalle del producto. Si quieres cambiar precios reales, debes actualizarlos en PostgreSQL o usar el script SQL de precios.',
      products: ofertas,
      actions: [{ label: 'Explorar ofertas', path: '/productos' }],
    };
  }

  if (/carrito|comprar|compra|checkout|pedido|pagar|cantidad/.test(consulta)) {
    return {
      text:
        cantidadCarrito > 0
          ? `Tienes ${cantidadCarrito} producto${cantidadCarrito === 1 ? '' : 's'} en el carrito. Total estimado: ${currency(totalCarrito)}.`
          : 'Tu carrito está vacío. Puedes agregar productos desde cualquier tarjeta o desde el detalle del producto.',
      actions: [
        { label: 'Abrir carrito', path: '/carrito' },
        { label: 'Seguir comprando', path: '/productos' },
      ],
    };
  }

  if (/pago|paypal|tarjeta|yape|cobro|cobrar/.test(consulta)) {
    return {
      text: 'NexaTech trabaja con PayPal, tarjeta y Yape como medios de pago configurables. Si el proveedor externo aún no está conectado, el pedido queda registrado para seguimiento interno.',
      actions: [{ label: 'Ir al checkout', path: '/checkout' }],
    };
  }

  if (/envio|envío|delivery|entrega|devolucion|devolución|cambio|garantia|garantía/.test(consulta)) {
    return {
      text: 'Puedes revisar envíos, devoluciones y garantía desde las políticas de compra. Si necesitas ayuda con un caso concreto, revisa tu pedido desde tu cuenta.',
      actions: [
        { label: 'Ver envíos', path: '/informacion/Envíos' },
        { label: 'Ver devoluciones', path: '/informacion/Devoluciones' },
      ],
    };
  }

  if (/cuenta|login|registro|perfil|direccion|dirección|favorito|favoritos/.test(consulta)) {
    return {
      text: 'Puedes crear cuenta, iniciar sesión, guardar direcciones, revisar pedidos y conservar favoritos para volver a ellos después.',
      actions: [
        { label: 'Mi cuenta', path: '/cuenta' },
        { label: 'Favoritos', path: '/cuenta/favoritos' },
      ],
    };
  }

  if (categoria) {
    const productosCategoria = productos.filter((p) => p.categoryId === categoria.id).slice(0, 3);
    return {
      text: `Tengo una selección para ${categoria.name.toLowerCase()} con equipos y accesorios pensados para rendimiento, compatibilidad y uso diario.`,
      products: productosCategoria,
      actions: [{ label: `Ver ${categoria.name}`, path: '/categoria/' + categoria.id }],
    };
  }

  if (encontrados.length) {
    return {
      text: 'Esto es lo más cercano que encontré dentro del catálogo.',
      products: encontrados,
      actions: [{ label: 'Ver catálogo completo', path: '/productos' }],
    };
  }

  return {
    text: 'No encontré una coincidencia exacta. Puedes probar con una categoría como laptops, smartphones, audio, periféricos, gaming, smart home o accesorios.',
    actions: [
      { label: 'Ver categorías', path: '/productos' },
      { label: 'Buscar productos', path: '/buscar' },
    ],
  };
}

export function AsistenteCompra() {
  const { state } = useShop();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<MensajeAsistente[]>([
    {
      id: 1,
      author: 'bot',
      text: 'Hola. Soy tu asistente NexaTech. Puedo ayudarte a encontrar productos, revisar pagos, entender el carrito o ubicar información de envíos.',
      actions: [{ label: 'Ver catálogo', path: '/productos' }],
    },
  ]);
  const id = useRef(2);
  const listRef = useRef<HTMLDivElement>(null);
  const products = state?.products || [];
  const unread = useMemo(() => Math.max(0, state?.count || 0), [state?.count]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  function enviar(texto: string) {
    const pregunta = texto.trim();
    if (!pregunta) return;
    const respuesta = responder(
      pregunta,
      products,
      state?.count || 0,
      state?.totals.total || 0,
    );
    setMessages((actuales) => [
      ...actuales,
      { id: id.current++, author: 'user', text: pregunta },
      { id: id.current++, author: 'bot', ...respuesta },
    ]);
    setInput('');
    setOpen(true);
  }

  function submit(event: { preventDefault: () => void }) {
    event.preventDefault();
    enviar(input);
  }

  return (
    <aside className="asistente-casaviva" aria-label="Asistente de compras NexaTech">
      {open && (
        <dialog className="asistente-panel" open aria-label="Chat de ayuda NexaTech">
          <header className="asistente-cabecera">
            <div>
              <span>
                <Sparkles size={15} /> Asistente NexaTech
              </span>
              <strong>¿Qué necesita tu setup?</strong>
            </div>
            <button
              type="button"
              className="asistente-cerrar"
              aria-label="Cerrar asistente"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </header>

          <div className="asistente-mensajes" ref={listRef} aria-live="polite">
            {messages.map((message) => (
              <article key={message.id} className={'asistente-mensaje ' + message.author}>
                <p>{message.text}</p>
                {!!message.products?.length && (
                  <div className="asistente-productos">
                    {message.products.map((product) => {
                      const variant = product.variants[0];
                      return (
                        <a key={product.id} href={productPath(product)}>
                          <span>{product.name}</span>
                          <small>
                            {currency(variant.price)} ·{' '}
                            {available(variant) > 0 ? 'Disponible' : 'Agotado'}
                          </small>
                        </a>
                      );
                    })}
                  </div>
                )}
                {!!message.actions?.length && (
                  <div className="asistente-acciones">
                    {message.actions.map((action) => (
                      <button
                        type="button"
                        key={action.label}
                        onClick={() => go(action.path)}
                      >
                        {action.label} <ArrowRight size={14} />
                      </button>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="asistente-sugerencias" aria-label="Preguntas rápidas">
            {sugerencias.map((sugerencia) => (
              <button type="button" key={sugerencia} onClick={() => enviar(sugerencia)}>
                {sugerencia}
              </button>
            ))}
          </div>

          <form className="asistente-formulario" onSubmit={submit}>
            <Search size={17} aria-hidden="true" />
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Escribe tu pregunta..."
              aria-label="Escribe tu pregunta para NexaTech"
              maxLength={160}
              autoComplete="off"
            />
            <button type="submit" aria-label="Enviar pregunta" disabled={!input.trim()}>
              <Send size={17} />
            </button>
          </form>
        </dialog>
      )}

      <button
        type="button"
        className="asistente-boton"
        aria-label={open ? 'Cerrar asistente NexaTech' : 'Abrir asistente NexaTech'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={23} /> : <MessageCircle size={24} />}
        {!open && unread > 0 && (
          <span aria-label={`${unread} productos en el carrito`}>
            <ShoppingBag size={12} /> {unread}
          </span>
        )}
      </button>
    </aside>
  );
}

