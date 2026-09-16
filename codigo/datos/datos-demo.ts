import type {
  Category,
  Coupon,
  Product,
  Room,
  Variant,
} from '../modelos/dominio';

// Catalogo base editable. PostgreSQL es la fuente activa cuando la app local esta conectada.
const categoryImage: Record<string, string> = {
  laptops: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=88',
  smartphones: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=88',
  audio: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=88',
  perifericos: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=88',
  gaming: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=1200&q=88',
  'smart-home': 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1200&q=88',
  accesorios: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=88',
};

export const categories: Category[] = [
  ['laptops', 'Laptops'],
  ['smartphones', 'Smartphones'],
  ['audio', 'Audio'],
  ['perifericos', 'Perifericos'],
  ['gaming', 'Gaming'],
  ['smart-home', 'Smart Home'],
  ['accesorios', 'Accesorios'],
].map(([id, name]) => ({
  id,
  name,
  image: categoryImage[id],
}));

export const coupons: Coupon[] = [
  { code: 'NEXA10', percent: 10, minSubtotal: 100000 },
];

type ProductInfo = {
  name: string;
  categoryId: string;
  material: string;
  price: number;
  tag: string;
  stock: number;
  dimensions: string;
  care: string;
  reviewName: string;
  review: string;
  previousPrice?: number;
  variants?: Array<{
    suffix: string;
    name: string;
    color: string;
    price?: number;
    previousPrice?: number;
    stock?: number;
  }>;
};

const productInfo: ProductInfo[] = [
  {
    name: 'NexaBook Air 14',
    categoryId: 'laptops',
    material: 'Intel Core Ultra 7 · 16 GB RAM · 1 TB SSD',
    price: 329900,
    tag: 'Nuevo',
    stock: 12,
    dimensions: '14 pulgadas · 1.25 kg · 16 horas de bateria',
    care: 'Incluye cargador USB-C de 65 W. Mantener lejos de humedad y calor extremo.',
    reviewName: 'Valeria R.',
    review: 'Ligera, rapida y perfecta para trabajo remoto con varias apps abiertas.',
    variants: [
      { suffix: 'natural', name: 'Grafito', color: '#1f2937', price: 329900, stock: 12 },
      { suffix: 'marfil', name: 'Plata lunar', color: '#d8dee9', price: 349900, stock: 3 },
    ],
  },
  {
    name: 'AeroPhone X1 5G',
    categoryId: 'smartphones',
    material: 'AMOLED 120 Hz · 256 GB · Camara 50 MP',
    price: 189900,
    tag: 'Seleccion NexaTech',
    stock: 10,
    dimensions: '6.7 pulgadas · bateria 5000 mAh · carga rapida 67 W',
    care: 'Incluye cable USB-C. Se recomienda mica de vidrio y funda antimpacto.',
    reviewName: 'Mariana C.',
    review: 'Pantalla muy fluida y buena autonomia para todo el dia.',
  },
  {
    name: 'DockStation USB-C Pro',
    categoryId: 'accesorios',
    material: 'HDMI 4K · Ethernet · USB-C PD 100 W',
    price: 24900,
    previousPrice: 29900,
    tag: 'Oferta',
    stock: 18,
    dimensions: '9 puertos · aluminio anodizado · 12 cm',
    care: 'Usar con fuente certificada. No cubrir durante sesiones largas.',
    reviewName: 'Lucia P.',
    review: 'Convierte la laptop en estacion de trabajo sin cables de sobra.',
  },
  {
    name: 'NovaPods Pro ANC',
    categoryId: 'audio',
    material: 'Cancelacion activa · Audio espacial · Bluetooth 5.4',
    price: 52900,
    tag: 'Mas vendido',
    stock: 14,
    dimensions: 'Hasta 32 horas con estuche · modo transparencia',
    care: 'Limpiar almohadillas con pano seco. No sumergir.',
    reviewName: 'Andrea M.',
    review: 'El aislamiento ayuda mucho para llamadas y viajes cortos.',
  },
  {
    name: 'QuantumView 27 QHD',
    categoryId: 'perifericos',
    material: 'Panel IPS · 165 Hz · HDR400',
    price: 139900,
    tag: 'Nuevo',
    stock: 9,
    dimensions: '27 pulgadas · QHD · USB-C display',
    care: 'Limpiar con microfibra. Evitar liquidos directos sobre el panel.',
    reviewName: 'Camila S.',
    review: 'Colores precisos y frecuencia ideal para diseno y juegos.',
  },
  {
    name: 'Orbit Keys TKL',
    categoryId: 'perifericos',
    material: 'Switches mecanicos brown · RGB · hot-swap',
    price: 34900,
    tag: 'Seleccion NexaTech',
    stock: 16,
    dimensions: 'Formato 80% · cable USB-C desmontable',
    care: 'Retirar keycaps para limpieza. No exponer a liquidos.',
    reviewName: 'Diego A.',
    review: 'Compacto, solido y con tacto comodo para escribir bastante.',
  },
  {
    name: 'PrecisionMouse MX',
    categoryId: 'perifericos',
    material: 'Sensor 26K DPI · 78 g · wireless 2.4 GHz',
    price: 18900,
    tag: 'Nuevo',
    stock: 22,
    dimensions: 'Hasta 70 horas · carga USB-C',
    care: 'Limpiar sensor con aire suave. Usar sobre superficie estable.',
    reviewName: 'Sofia L.',
    review: 'Preciso y liviano, se nota en edicion y juegos competitivos.',
  },
  {
    name: 'Pulse Deck Portable',
    categoryId: 'gaming',
    material: 'Pantalla 7 pulgadas · 512 GB · controles Hall',
    price: 159900,
    tag: 'Agotado',
    stock: 0,
    dimensions: 'Consola portatil · Wi-Fi 6E · bateria 45 Wh',
    care: 'Usar funda rigida para transporte. Mantener ventilacion despejada.',
    reviewName: 'Renato V.',
    review: 'Corre indies y streaming local con controles muy comodos.',
  },
  {
    name: 'MeshWave WiFi 6 Duo',
    categoryId: 'smart-home',
    material: 'Wi-Fi 6 · cobertura mesh · app parental',
    price: 44900,
    tag: 'Nuevo',
    stock: 11,
    dimensions: 'Pack de 2 nodos · hasta 350 m2',
    care: 'Ubicar en zonas abiertas. Actualizar firmware desde la app.',
    reviewName: 'Paula G.',
    review: 'La senal mejoro en dormitorios y home office sin configuracion complicada.',
    variants: [
      { suffix: 'blanco', name: 'Blanco mate', color: '#f5f7fb', price: 44900, stock: 7 },
      { suffix: 'negro', name: 'Negro carbono', color: '#111827', price: 46900, stock: 4 },
    ],
  },
  { name: 'Camara StreamCam 2K', categoryId: 'perifericos', material: '2K · microfonos duales · autofocus', price: 29900, tag: 'Nuevo', stock: 13, dimensions: '1440p · clip universal · USB-C', care: 'Cubrir lente cuando no se use. Limpiar con microfibra.', reviewName: 'Rosa M.', review: 'La imagen se ve mucho mejor que la webcam integrada.' },
  { name: 'PowerBank Graphene 20K', categoryId: 'accesorios', material: '20000 mAh · PD 65 W · display digital', price: 21900, previousPrice: 26900, tag: 'Oferta', stock: 20, dimensions: 'Carga laptop ligera y smartphone', care: 'No dejar al sol ni descargar por completo durante meses.', reviewName: 'Mateo C.', review: 'Salva viajes largos y carga rapido sin calentarse demasiado.' },
  { name: 'SoundBar Arc Mini', categoryId: 'audio', material: 'Dolby Audio · subwoofer compacto · HDMI ARC', price: 69900, tag: 'Mas vendido', stock: 8, dimensions: '60 cm · Bluetooth · control remoto', care: 'Mantener rejilla libre de polvo. Actualizar firmware.', reviewName: 'Laura T.', review: 'Mejoro peliculas y musica sin ocupar media sala.' },
  { name: 'GamePad Forge X', categoryId: 'gaming', material: 'Hall effect · Bluetooth · USB-C', price: 23900, previousPrice: 28900, tag: 'Oferta', stock: 17, dimensions: 'PC, Android y consola compatible', care: 'Guardar en estuche. Calibrar desde la app si cambias de plataforma.', reviewName: 'Elena B.', review: 'Sticks precisos y cero drift hasta ahora.' },
  { name: 'SmartWatch Nova Fit', categoryId: 'smartphones', material: 'AMOLED · GPS · salud 24/7', price: 39900, tag: 'Nuevo', stock: 15, dimensions: 'Caja 45 mm · resistencia 5 ATM', care: 'Secar despues de ejercicios. Usar cargador magnetico incluido.', reviewName: 'Nadia F.', review: 'Buen seguimiento de actividad y notificaciones limpias.' },
  { name: 'Sensor Kit HomeGuard', categoryId: 'smart-home', material: 'Movimiento · puerta · temperatura · hub Zigbee', price: 32900, tag: 'Seleccion NexaTech', stock: 12, dimensions: 'Kit de 4 sensores + hub', care: 'Cambiar baterias cuando la app lo indique.', reviewName: 'Brenda S.', review: 'Automatiza luces y alertas sin complicarse.' },
  { name: 'Cargador GaN Trio 100W', categoryId: 'accesorios', material: '3 puertos · USB-C PD · GaN', price: 18900, tag: 'Nuevo', stock: 28, dimensions: '2 USB-C + 1 USB-A · enchufe plegable', care: 'Usar cables certificados para maxima potencia.', reviewName: 'Fiorella A.', review: 'Carga laptop, tablet y celular con un solo bloque.' },
  { name: 'Tablet SlatePad 11', categoryId: 'smartphones', material: 'Pantalla 2.5K · stylus · 128 GB', price: 119900, previousPrice: 139900, tag: 'Oferta', stock: 7, dimensions: '11 pulgadas · 8 GB RAM · Wi-Fi 6', care: 'Usar protector de pantalla si se dibuja con frecuencia.', reviewName: 'Tomas R.', review: 'Ideal para notas, series y reuniones.' },
  { name: 'SSD Portable Nano 2TB', categoryId: 'accesorios', material: 'USB 3.2 Gen 2 · 1050 MB/s · aluminio', price: 49900, tag: 'Nuevo', stock: 19, dimensions: '2 TB · cable USB-C incluido', care: 'Expulsar antes de desconectar. Evitar golpes durante transferencia.', reviewName: 'Claudia E.', review: 'Rapido para backups y proyectos pesados.' },
  { name: 'LightSync Bulb Pack', categoryId: 'smart-home', material: 'RGB CCT · Wi-Fi · voz', price: 12900, tag: 'Mas vendido', stock: 34, dimensions: 'Pack de 4 focos E27', care: 'Instalar con interruptor apagado. No usar en luminarias cerradas.', reviewName: 'Monica H.', review: 'Las escenas quedan muy bien para reuniones y peliculas.' },
  { name: 'MicCast Studio USB', categoryId: 'audio', material: 'Condensador · USB-C · filtro pop', price: 27900, tag: 'Seleccion NexaTech', stock: 10, dimensions: 'Patron cardioide · soporte metalico', care: 'Evitar golpes y humedad. Guardar con cubierta antipolvo.', reviewName: 'Pilar J.', review: 'Voz clara para streams y clases virtuales.' },
  { name: 'Kit Limpieza TechCare', categoryId: 'accesorios', material: 'Microfibra · brocha · spray sin alcohol', price: 5900, tag: 'Nuevo', stock: 40, dimensions: 'Kit compacto para pantallas y teclados', care: 'Aplicar liquido sobre el pano, no directo al equipo.', reviewName: 'Gonzalo P.', review: 'Deja laptop y monitor impecables.' },
  { name: 'Cable ThunderLink 240W', categoryId: 'accesorios', material: 'USB-C 4 · 240 W · 40 Gbps', price: 8900, previousPrice: 10900, tag: 'Oferta', stock: 26, dimensions: '1 metro · e-marker integrado', care: 'No doblar en angulos cerrados.', reviewName: 'Isabel N.', review: 'Sirve para carga rapida y monitor externo sin dramas.' },
  { name: 'Mini Proyector BeamGo', categoryId: 'gaming', material: '1080p · Android TV · Wi-Fi dual', price: 79900, tag: 'Nuevo', stock: 6, dimensions: '250 ANSI · parlantes 10 W', care: 'Usar en superficie ventilada. Limpiar filtro regularmente.', reviewName: 'Ana K.', review: 'Perfecto para cine casual en cuarto oscuro.' },
  { name: 'NexaCam Doorbell', categoryId: 'smart-home', material: 'Video 2K · bateria · deteccion IA', price: 39900, tag: 'Seleccion NexaTech', stock: 13, dimensions: 'Timbre inteligente · vision nocturna', care: 'Cargar cada 3 a 5 meses segun uso.', reviewName: 'Carla D.', review: 'Alertas rapidas y buena imagen de noche.' },
  { name: 'Stand ErgoDock Laptop', categoryId: 'perifericos', material: 'Aluminio · altura ajustable · plegable', price: 14900, previousPrice: 17900, tag: 'Oferta', stock: 24, dimensions: 'Para laptops de 11 a 17 pulgadas', care: 'Ajustar sobre mesa estable. Limpiar con pano seco.', reviewName: 'Marco L.', review: 'Mejoro postura y libera espacio en escritorio.' },
  { name: 'Router TravelLink 5G', categoryId: 'smart-home', material: '5G · eSIM · Wi-Fi 6 portatil', price: 69900, tag: 'Nuevo', stock: 5, dimensions: 'Bateria 5000 mAh · VPN integrado', care: 'Actualizar firmware y usar perfiles eSIM confiables.', reviewName: 'Diana V.', review: 'Conexion estable para viajar y trabajar fuera.' },
  { name: 'Headset Arena Wireless', categoryId: 'gaming', material: '2.4 GHz · microfono desmontable · 50 mm', price: 35900, tag: 'Nuevo', stock: 14, dimensions: 'Hasta 45 horas · almohadillas memory foam', care: 'Guardar colgado o en estuche. Limpiar almohadillas.', reviewName: 'Cesar Q.', review: 'Comodo para sesiones largas y buena separacion de audio.' },
  { name: 'Mousepad Control XL', categoryId: 'gaming', material: 'Superficie microtexturizada · base goma', price: 6900, previousPrice: 8900, tag: 'Oferta', stock: 32, dimensions: '90 x 40 cm · bordes cosidos', care: 'Lavar a mano y secar extendido.', reviewName: 'Patricia O.', review: 'Grande y estable, no se mueve con el teclado encima.' },
  { name: 'Adaptador HDMI Capture 4K', categoryId: 'perifericos', material: 'Captura 4K passthrough · 1080p60', price: 25900, tag: 'Nuevo', stock: 9, dimensions: 'HDMI in/out · USB-C a PC', care: 'No bloquear ventilacion durante grabaciones largas.', reviewName: 'Jimena U.', review: 'Facil para grabar consola y clases sin drivers raros.' },
  { name: 'Panel LED PixelWall', categoryId: 'smart-home', material: 'RGB modular · app escenas · musica reactiva', price: 59900, tag: 'Nuevo', stock: 11, dimensions: 'Kit 9 paneles · montaje adhesivo', care: 'Instalar sobre pared limpia y seca.', reviewName: 'Alonso Z.', review: 'Hace que el setup se vea profesional.' },
  { name: 'Laptop Stand Cooling Pro', categoryId: 'perifericos', material: 'Base ventilada · 5 niveles · USB passthrough', price: 15900, tag: 'Mas vendido', stock: 18, dimensions: 'Para 15 a 17 pulgadas', care: 'Limpiar ventiladores cada mes.', reviewName: 'Vanessa I.', review: 'Baja temperatura y mejora el angulo de escritura.' },
  { name: 'SmartTag Locator Pack', categoryId: 'smartphones', material: 'Bluetooth LE · red colaborativa · IP67', price: 12900, tag: 'Seleccion NexaTech', stock: 30, dimensions: 'Pack de 2 localizadores', care: 'Cambiar pila CR2032 cuando avise la app.', reviewName: 'Rafael W.', review: 'Util para llaves y mochila.' },
  { name: 'Regleta SurgeGuard 8', categoryId: 'accesorios', material: '8 tomas · USB-C · proteccion sobretension', price: 14900, tag: 'Nuevo', stock: 25, dimensions: 'Cable 1.8 m · interruptor independiente', care: 'No sobrecargar. Usar toma con tierra.', reviewName: 'Sandra Y.', review: 'Ordena y protege todo el setup.' },
  { name: 'Speaker MiniWave IPX7', categoryId: 'audio', material: 'Bluetooth · IPX7 · 18 horas', price: 19900, previousPrice: 24900, tag: 'Oferta', stock: 16, dimensions: 'Parlante compacto · graves pasivos', care: 'Secar puerto antes de cargar.', reviewName: 'Teresa N.', review: 'Suena fuerte para el tamano y aguanta exteriores.' },
  { name: 'VR Lite Motion Set', categoryId: 'gaming', material: 'Visor ligero · 6DoF · controles incluidos', price: 129900, tag: 'Nuevo', stock: 4, dimensions: 'Campo 100 grados · ajuste IPD', care: 'Limpiar lentes con pano optico. Usar en area despejada.', reviewName: 'Rocio X.', review: 'Muy inmersivo para simuladores y experiencias cortas.' },
  { name: 'Camara Seguridad Duo 2K', categoryId: 'smart-home', material: 'Exterior IP66 · 2K · vision nocturna color', price: 44900, tag: 'Nuevo', stock: 12, dimensions: 'Pack de 2 camaras · almacenamiento local', care: 'Instalar protegida de chorros directos. Revisar sellos.', reviewName: 'Milagros Z.', review: 'Buena nitidez y alertas utiles sin pagar nube obligatoria.' },
  { name: 'Soporte Monitor ArmFlex', categoryId: 'perifericos', material: 'Brazo gas · VESA · gestion de cables', price: 19900, tag: 'Oferta', previousPrice: 24900, stock: 21, dimensions: 'Para 17 a 32 pulgadas · hasta 9 kg', care: 'Ajustar tension antes de soltar el monitor.', reviewName: 'Oscar J.', review: 'El escritorio queda mas limpio y ergonomico.' },
  { name: 'Cargador MagSafe Desk', categoryId: 'accesorios', material: '15 W magnetico · soporte aluminio · Qi2', price: 16900, tag: 'Mas vendido', stock: 28, dimensions: 'Base de escritorio · inclinacion fija', care: 'Usar adaptador de 20 W o superior.', reviewName: 'Natalia M.', review: 'Practico para ver notificaciones mientras carga.' },
];

const fallbackColors = ['#111827', '#0ea5e9', '#a3e635', '#f59e0b'];

const productPhotoPool: Record<string, string[]> = {
  laptops: [
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1000&q=88',
    'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=1000&q=88',
    'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=1000&q=88',
  ],
  smartphones: [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1000&q=88',
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=1000&q=88',
    'https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=1000&q=88',
  ],
  audio: [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=88',
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=1000&q=88',
    'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1000&q=88',
  ],
  perifericos: [
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1000&q=88',
    'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1000&q=88',
    'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=1000&q=88',
  ],
  gaming: [
    'https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=1000&q=88',
    'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1000&q=88',
    'https://images.unsplash.com/photo-1616588589676-62b3bd4ff6d2?auto=format&fit=crop&w=1000&q=88',
  ],
  'smart-home': [
    'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1000&q=88',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1000&q=88',
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1000&q=88',
  ],
  accesorios: [
    'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1000&q=88',
    'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=1000&q=88',
    'https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=1000&q=88',
  ],
};

function productImages(index: number, categoryId: string) {
  const photos = productPhotoPool[categoryId] || productPhotoPool.accesorios;
  return {
    images: [
      photos[index % photos.length],
      'https://images.unsplash.com/photo-1593642532400-2682810df593?auto=format&fit=crop&w=1200&q=88',
    ],
    atlas: undefined,
  };
}

function makeVariants(info: ProductInfo, index: number): Variant[] {
  if (info.variants?.length)
    return info.variants.map((variant) => ({
      id: `cv-${index}-${variant.suffix}`,
      name: variant.name,
      color: variant.color,
      price: variant.price ?? info.price,
      previousPrice: variant.previousPrice ?? info.previousPrice,
      inventory: { stock: variant.stock ?? info.stock, reserved: 0 },
    }));
  return [
    {
      id: `cv-${index}-natural`,
      name: info.material.split(' · ')[0] || 'Base',
      color: fallbackColors[index % fallbackColors.length],
      price: info.price,
      previousPrice: info.previousPrice,
      inventory: { stock: info.stock, reserved: 0 },
    },
  ];
}

export const products: Product[] = productInfo.map((info, index) => ({
  id: String(index),
  name: info.name,
  categoryId: info.categoryId,
  brand: { id: 'nexatech', name: 'NexaTech' },
  material: info.material,
  tag: info.tag,
  description:
    'Equipo seleccionado para mejorar tu productividad, entretenimiento y setup diario con compra segura, stock visible y soporte local.',
  ...productImages(index, info.categoryId),
  variants: makeVariants(info, index),
  reviews: [
    {
      id: `review-${index}`,
      productId: String(index),
      name: info.reviewName,
      rating: index === 7 ? 4 : 5,
      comment: info.review,
      demo: true,
    },
  ],
  specifications: {
    Plataforma: info.material,
    Formato: info.dimensions,
    Recomendacion: info.care,
  },
}));

export const rooms: Room[] = [
  {
    id: 'setup-principal',
    name: 'Setup principal',
    slug: 'setup-principal',
    image: 'https://images.unsplash.com/photo-1593642532400-2682810df593?auto=format&fit=crop&w=1800&q=90',
    imageMobile: 'https://images.unsplash.com/photo-1593642532400-2682810df593?auto=format&fit=crop&w=1000&q=88',
    title: 'Compra el setup',
    subtitle:
      'Explora los puntos del escritorio y arma una estacion lista para trabajar, jugar y crear.',
    isActive: true,
    sortOrder: 1,
    createdAt: '2026-09-12T00:00:00.000Z',
    updatedAt: '2026-09-15T00:00:00.000Z',
    products: [
      {
        id: 'setup-laptop',
        productId: '0',
        variantId: 'cv-0-natural',
        positionX: 51,
        positionY: 56,
        isActive: true,
        sortOrder: 1,
        tooltipPosition: 'top',
      },
      {
        id: 'setup-monitor',
        productId: '4',
        positionX: 50,
        positionY: 32,
        isActive: true,
        sortOrder: 2,
        tooltipPosition: 'bottom',
      },
      {
        id: 'setup-keyboard',
        productId: '5',
        positionX: 48,
        positionY: 73,
        isActive: true,
        sortOrder: 3,
        tooltipPosition: 'top',
      },
      {
        id: 'setup-mouse',
        productId: '6',
        positionX: 65,
        positionY: 74,
        isActive: true,
        sortOrder: 4,
        tooltipPosition: 'top',
      },
      {
        id: 'setup-audio',
        productId: '3',
        positionX: 79,
        positionY: 46,
        isActive: true,
        sortOrder: 5,
        tooltipPosition: 'left',
      },
      {
        id: 'setup-dock',
        productId: '2',
        positionX: 29,
        positionY: 67,
        isActive: true,
        sortOrder: 6,
        tooltipPosition: 'right',
      },
      {
        id: 'setup-luz',
        productId: '29',
        positionX: 24,
        positionY: 37,
        isActive: true,
        sortOrder: 7,
        tooltipPosition: 'right',
      },
      {
        id: 'setup-router',
        productId: '8',
        positionX: 84,
        positionY: 72,
        isActive: true,
        sortOrder: 8,
        tooltipPosition: 'left',
      },
    ],
  },
];
