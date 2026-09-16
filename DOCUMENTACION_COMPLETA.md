# CasaViva

Implementación React + TypeScript + Vite, Node.js/Express y PostgreSQL que conserva la maqueta `../casaviva-prototype`, sus imágenes de etapa 2 y su vídeo de etapa 3. Toda la interfaz sigue en español. El proyecto Nexo y sus tablas existentes permanecen separados.

## Estado de entrega

La aplicación funciona localmente con persistencia real en PostgreSQL y **catálogo, precios, stock y pedidos sintéticos**. El modo de demostración es explícito. Incluye correo local, cola persistente, importador de catálogo, contenido configurable y adaptadores de integración comprobados con dobles de prueba. Los cobros reales siguen bloqueados. Por solicitud del usuario, **dominio, hosting y publicación quedan fuera de esta entrega**.

El texto de referencia no se ejecutó como una lista automática de prompts. Esta entrega integra la interfaz y su preparación técnica siguiendo la última solicitud.

## Inicio y validación

Requisitos: Node.js 22.13 o superior, npm y PostgreSQL (17 en el entorno local verificado). Se reutilizan las dependencias y el lockfile de `ecommerce`; no se instalaron paquetes nuevos.

Desde `ecommerce`:

```sh
npm ci
npm run casaviva:dev
```

En este equipo ya existe `.env.local` privado. La base `nexo_store`, con los esquemas `public` (Nexo) y `casaviva`, está en el servicio PostgreSQL 17 de Windows, puerto **5432**. `externalService=true` evita iniciar el clúster anterior del puerto 55432. Se conservaron el origen y un respaldo privado de la migración. `npm run casaviva:dev`, desde la carpeta `ecommerce`, comprueba PostgreSQL, intenta iniciar PostgreSQL 17 si está apagado, aplica migraciones pendientes y arranca la página. `INICIAR_CASAVIVA.cmd` también inicia la aplicación en Windows. Abrir `http://localhost:3024`. Bandeja privada de pruebas: `http://localhost:3024/dev/mail`.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

`npm start` usa el build y fuerza `NODE_ENV=production`: requiere `CASAVIVA_ORIGIN` HTTPS y un proxy TLS. Para desarrollo, `npm run dev` sirve API, HTML y Vite en el mismo origen con recarga de interfaz. No abrir el HTML directamente ni usar `vite preview` como servidor del sistema: necesita la API.

Para un entorno nuevo: copiar `variables-entorno.ejemplo` a `.env.local`, configurar una conexión propia, elegir el modo y ejecutar `npm run db:migrate` con una identidad autorizada para crear el esquema. La migración es aditiva, transaccional e idempotente; no vacía tablas ni reemplaza datos. El usuario de ejecución solo necesita USAGE del esquema y SELECT/INSERT/UPDATE/DELETE sobre sus tablas. No usar el usuario de migraciones como usuario de ejecución en producción.

`npm run db:local` es una comodidad **exclusiva de este workspace**: reutiliza la configuración privada PostgreSQL ya existente de Nexo, crea únicamente `casaviva` y otorga acceso al usuario de aplicación existente. No exportar esa configuración privada.

Las pruebas HTTP crean y eliminan su propia base temporal `casaviva_test_<UUID>`; nunca borran la base de la tienda. En otro equipo sin la configuración local de pruebas se omite esa prueba de integración, lo que debe resolverse antes de certificar dicho despliegue.

## Arquitectura equivalente a MVC

| Capa | Archivos | Responsabilidad |
|---|---|---|
| Model / schemas | `src/models/domain.ts`, `forms.ts`, `seo.ts` | Entidades, Zod, cantidades, stock, importes en céntimos, transformaciones y metadatos |
| View | `src/views/*`, `src/main.tsx` | Páginas, formularios, layouts, accesibilidad, eventos y estados |
| Controller cliente | `src/controllers/client.ts`, `use-shop.tsx` | Peticiones HTTP, estado de presentación, bloqueo de doble clic y avisos |
| Controller servidor | `server/actions.ts`, `src/controllers/shop-controller.ts` | Lista cerrada de acciones, entradas y coordinación de servicios |
| Services | `src/services/*` | Autenticación, carrito, catálogo, pedidos y puertos de pago/correo |
| Repository | `server/database.ts`, `src/repositories/contracts.ts` | Persistencia, sesiones y transacciones PostgreSQL |
| Datos de prueba | `src/data/fixtures.ts`, `src/repositories/demo-repository.ts` | Fixtures explícitos y adaptador en memoria para tests |
| Config / entrega | `server/config.ts`, `variables-entorno.ejemplo`, `deploy/*` | Validación de entorno, arranque y plantilla de proceso |

Flujo: View → cliente HTTP → acción validada → servicio → repositorio transaccional → PostgreSQL → respuesta limitada a los datos del usuario. El adaptador en memoria no es la fuente del navegador. Los secretos, contraseñas derivadas y sesiones no se devuelven al cliente. Las Views pueden calcular presentación sencilla; no consultan PostgreSQL.

Entidades: producto, categoría, marca, variante, inventario, usuario/cliente, dirección, carrito/línea, favorito, cupón, reseña, pedido/línea y pago. No se añadió administración fuera del alcance.

## Rutas y funciones

`/`, `/productos`, `/categoria/:slug`, `/producto/:slug`, `/buscar`, `/carrito`, `/checkout`, `/login`, `/registro`, `/recuperar`, `/restablecer`, `/cuenta`, `/cuenta/direcciones`, `/cuenta/pedidos`, `/cuenta/favoritos`, `/pedido/:id` y `/compra-completada/:id`.

Los enlaces antiguos `/catalogo`, `/direcciones`, `/pedidos`, `/favoritos` y enlaces hash del prototipo se conservan mediante equivalencias. Los productos tienen slug descriptivo. Las rutas públicas se sirven directamente y las desconocidas devuelven 404; las acciones privadas verifican la sesión y propiedad en servidor.

Carrito invitado por cookie, fusión al iniciar sesión conservando cupón, cantidades, eliminación, favoritos, búsqueda sin tildes, filtros, ordenamiento y paginación. Perfil y direcciones persistentes. Checkout con consentimiento, dirección, validación de stock, cálculo en servidor, transacción e idempotencia por usuario y clave. El pedido conserva las líneas y precios de ese momento.

Registro/login y cierre de sesión reales en el servidor local. Cookies HttpOnly/SameSite, Secure y prefijo `__Host-` bajo HTTPS; token aleatorio guardado como hash, expiración de siete días y rotación al autenticar/cerrar sesión. PBKDF2-SHA256 con 600.000 iteraciones y sal individual. Recuperación con token de un uso, hash SHA-256 en persistencia, vencimiento de 15 minutos y revocación de sesiones. Con correo configurado la API responde igual para cuentas existentes y desconocidas; el enlace se entrega por la cola privada, no por la respuesta HTTP.

## API y seguridad

`POST /api/commerce/:action` con `{ "args": [...] }`. Acciones permitidas están enumeradas en `server/actions.ts`; no hay invocación dinámica de métodos recibidos del usuario. `GET /api/health` comprueba conectividad.

Validación Zod; cuerpo máximo 32 KB; origen exacto obligatorio; Fetch Metadata; sin CORS abierto; cookies de sesión en vez de tokens en localStorage; consultas parametrizadas; límites de intentos en PostgreSQL compartidos entre procesos; Helmet/CSP; respuestas privadas `no-store`; errores internos sin credenciales ni consultas. Se ignoran precios/totales que envíe el navegador. Los encabezados de proxy no se confían automáticamente.

`CASAVIVA_DEMO=false` bloquea checkout con 503, sin crear pedidos ni cambiar stock. `PaymentService` recibe importe calculado, moneda, identidad y clave idempotente del servidor. `server/paypal.ts` prepara OAuth, creación, captura idempotente, consulta y verificación de firma mediante la API oficial. `server/payments.ts` prepara reserva, conciliación de importe/moneda, cancelación y vencimiento. Se prueban sin conectarse a PayPal; **todavía no están conectados al checkout HTTP ni a una ruta pública de webhook**. Antes de habilitarlos hacen falta cuenta, credenciales, pruebas sandbox, política PEN/USD, flujo de retorno y revisión/reembolso de casos excepcionales. No se ha elegido proveedor para tarjeta/Yape ni se inventó su API.

## Recursos, interfaz y rendimiento

| Recurso | View/sección | Carga |
|---|---|---|
| `hero-desktop-{960,1600}.webp`, `hero-mobile-{600,960}.webp` | Hero principal | Prioridad alta, `picture` responsive |
| `categoria-*-{480,800}.webp` | CategoryCard | Lazy, tamaños responsive |
| `products.png` | ProductCard, galería, carrito y pedido | Atlas aprobado, solo fotografías; pendiente exportar productos individuales definitivos |
| `editorial-organizacion-{640,960}.webp` | Sección editorial | Lazy |
| `promocion-dormitorio-*` | Recursos alternativos de campaña | Disponibles para desktop/móvil, no todos se descargan |
| `poster.webp`, `dormitorio-luz-loop.{webm,mp4}` | PromotionBanner / Ambient | Póster estático; vídeo sin precarga, pausa fuera de pantalla |

Fondos independientes de textos, precios y controles HTML. Tipografía editorial de sistema + sans-serif, sin peticiones a servicios de fuentes. Marfil, arena, carbón, oliva y terracota; espaciado generoso, fotografías cálidas y tarjetas discretas. Conservar esas decisiones al añadir catálogo real.

En móvil: navegación y filtros en modal, categorías desplazables, dos columnas de productos, formularios y checkout apilados, galería adaptable. En tablet se ajustan columnas y separaciones. Foco visible, enlace para saltar al contenido, labels, alternativas de imagen, estados anunciados y Escape en modal. El vídeo respeta reducción de movimiento/ahorro de datos/conexión lenta; queda el póster ante fallos. No se animan textos, productos principales o botones.

Páginas y modal se cargan por separado. Build de referencia: entrada JS ~316 KB / ~97 KB gzip, CSS ~32 KB / ~7 KB gzip. El servidor permite caché de recursos y revalidación de HTML. No hay consultas por tarjeta (N+1), aunque el repositorio aún lee las colecciones completas. La respuesta HTTP se valida con DTO Zod en servidor y cliente.

Estados disponibles: loading, vacío, error/reintento, sin resultados, agotado, añadido al carrito, cupón inválido/aplicado, formulario inválido, fallo de conexión y pedido de prueba completado.

## SEO y publicación

Metadatos por ruta y producto, Open Graph, canonical, HTML semántico y rutas legibles. Metadatos iniciales servidos por Node y actualizados al navegar. JSON-LD Product preparado solo para datos no demo; no se publican ofertas/valoraciones sintéticas como datos reales. La interfaz sigue siendo SPA, no SSR completo de contenido.

**Robots, cabecera noindex y sitemap vacío permanecen cerrados al rastreo en la demostración**. El sitemap dinámico y las reglas de indexación están implementados para un entorno real con contenido aprobado y `CASAVIVA_INDEXABLE=true`. Solo incluye inicio, catálogo, categorías y productos; cuenta, carrito, búsqueda, recuperación y checkout conservan noindex. La activación editorial queda pendiente; no se ha publicado ninguna URL externa.

## Variables y pendientes reales

| Variable | Uso |
|---|---|
| `CASAVIVA_DATABASE_URL` | Conexión privada PostgreSQL; únicamente servidor |
| `CASAVIVA_ORIGIN` | Origen público exacto; HTTPS obligatorio en producción |
| `CASAVIVA_PORT` | Puerto interno, 3024 por defecto |
| `CASAVIVA_DEMO` | `true` para datos sintéticos; `false` inicializa catálogo vacío y bloquea integraciones pendientes |
| `NODE_ENV` | Lo define el comando de arranque; no poner development en `.env.local`, porque Vite también lee ese archivo |

El almacén registra su modo: el servidor rechaza cambiar demo/real sobre los mismos datos. Para operación real usar una base nueva/configuración separada e importar catálogo aprobado; no renombrar los fixtures como reales.

Pendientes del propietario: catálogo/precios/stock/fotografías reales, condiciones de impuestos/envíos, contenido legal/contacto/redes, proveedor concreto para tarjeta y Yape, cuenta y configuración PayPal. Para enviar correos a Internet se necesita una cuenta de proveedor y remitente verificado; no se creó una cuenta externa ni una dirección ficticia. Dominio y hosting se omiten por petición expresa.

## Riesgos y despliegue

La migración 002 separa el agregado original en registros JSONB por entidad y conserva el antiguo snapshot como respaldo de migración. Las lecturas usan snapshots consistentes; las escrituras actualizan registros modificados en transacciones serializables con reintento. Hay índices únicos de correo e idempotencia de pedidos. Se eliminó el bloqueo global `FOR UPDATE` del almacén. **No equivale a un esquema relacional completamente normalizado ni a una certificación de escala**: todavía carga colecciones completas. La prueba local de 30 lecturas HTTP simultáneas pasó en aproximadamente 242 ms; falta medir volúmenes y tráfico reales. No se ha realizado auditoría de seguridad independiente.

La plantilla Linux `deploy/casaviva.service.example` se conserva como referencia previa, **no instalada ni desplegada**. Su puesta en marcha queda fuera del alcance solicitado ahora. No publicar `.env.local`, `.local-private`, código fuente o puertos de PostgreSQL. Antes de un futuro lanzamiento habrá que configurar infraestructura, copias verificadas y restauración con los datos reales.

Los límites por IP detrás de un proxy verán la IP de ese proxy mientras `trust proxy=false`; configurar explícitamente la topología fiable antes de tráfico público. Definir retención/depuración de carritos invitados, cuentas demo y pedidos según las condiciones reales. No reutilizar el esquema de pruebas como producción.

Referencias técnicas consultadas: [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) y [Express: seguridad en producción](https://expressjs.com/es/advanced/best-practice-security/).

## Correo preparado

`CASAVIVA_MAIL=local` guarda mensajes en `.local-private/mail`, excluido de Git. `/dev/mail` muestra texto seguro, sin ejecutar HTML de los mensajes; solo se habilita fuera de producción, para loopback y Host esperado. Recuperación, bienvenida y confirmación de pedido escriben en `casaviva.mail_outbox`; un trabajador procesa cada cinco segundos y reintenta hasta ocho veces. Las claves evitan duplicados locales. Entrega externa es **al menos una vez**: una caída después de aceptar un correo podría duplicarlo. Mensajes sin entregar tras ocho intentos necesitan revisión; no existe panel administrativo. El contenido de mensajes entregados se elimina de la cola; la bandeja de pruebas conserva sus copias privadas.

`CASAVIVA_MAIL=sendgrid` selecciona el adaptador externo; exige `CASAVIVA_SENDGRID_KEY` privado y `CASAVIVA_MAIL_FROM` verificado. Se validó con un transporte simulado, no con credenciales reales. No activa campañas publicitarias: para campañas se deberá añadir gestión de bajas y retención/consentimiento comercial. `disabled` bloquea recuperación y comunidad en modo real. El correo local está prohibido en `NODE_ENV=production`.

## Cargar contenido y catálogo aprobados

Copiar `configuracion/contenido-tienda.ejemplo.json` a `configuracion/contenido-tienda.json`, completar textos y reiniciar el servidor. La View `Information` obtiene estos textos a través de `/api/storefront`, con loading y error/reintento. No se admite marcar contenido como aprobado si conserva `[DATO PENDIENTE]`. No se redactaron políticas ni contactos ficticios.

`configuracion/catalogo.plantilla.json` comienza vacío y sin aprobar. El contrato de cada producto está en `productDto` de `src/models/api-schemas.ts`: identificadores estables, nombre, categoría, marca, material, descripción, imágenes locales, etiqueta, variantes con precio en céntimos/stock y reseñas reales. Para productos reales se omite `atlas`, no se permiten reseñas demo ni marcadores pendientes. Cada variante debe usar ID único, precio positivo, precio anterior mayor al actual cuando exista y `inventory.reserved=0` en el archivo. El importador conserva las reservas que ya tenga la base.

```sh
npm run catalog:import -- catalogo-aprobado.json --validate
npm run catalog:import -- catalogo-aprobado.json
```

La primera orden solo valida estructura. La segunda verifica imágenes existentes y actualiza productos en una base separada en modo real, dentro de una transacción. No elimina productos/variantes existentes ni modifica pedidos; rechaza duplicados y stock menor a reservas. El catálogo actual demo se preserva. Los importes de envío y descuentos del fixture siguen siendo solo de demostración: las reglas comerciales definitivas deben proporcionarse y configurarse antes de habilitar checkout real.

Validación de esta ampliación: lint, TypeScript, build, 21 pruebas automatizadas; integración PostgreSQL con migración repetible, checkout concurrente, sesiones, tokens y cola de correo; smoke del build con 14 rutas, errores 404, SEO, CSP y assets. Los adapters PayPal/SendGrid se probaron con dobles, sin pagos ni mensajes externos. [PayPal Orders](https://developer.paypal.com/api/orders/v2), [monedas soportadas](https://developer.paypal.com/reports/reference/supported-currencies), [verificación de webhooks](https://developer.paypal.com/api/webhooks/v1/verify-webhook-signature-post), [SendGrid Mail Send](https://www.twilio.com/docs/sendgrid/api-reference/mail-send/mail-send).

Revisión de navegador: recuperación y recepción del correo local, página informativa con marcadores pendientes, móvil de 390 px y tablet de 768 px sin desbordamiento horizontal; consola sin errores durante esas comprobaciones. No se certificó compatibilidad con Safari ni dispositivos físicos.
