# NexaTech - sistema web de tienda tecnologica

Esta copia está organizada con nombres más entendibles en VS Code.

| Carpeta o archivo | Qué contiene |
|---|---|
| `codigo` | Interfaz React, vistas, modelos, servicios y controladores |
| `codigo/vistas` | Pantallas: inicio, catálogo, producto, carrito, cuenta y checkout |
| `servidor` | API local, conexión a PostgreSQL, seguridad, correo y pagos preparados |
| `servidor/migraciones` | Estructura SQL del sistema |
| `pruebas` | Tests automatizados |
| `publico/recursos` | Imágenes, videos y fondos |
| `configuracion` | Plantillas de contenido y catálogo |
| `base-de-datos` | Scripts SQL para ver y modificar precios |

Algunos nombres se conservan porque los exige la herramienta: `package.json`, `package-lock.json`, `tsconfig.json`, `index.html`, `node_modules` y `.gitignore`.

Para ejecutar esta copia:

```powershell
npm ci
npm run dev
```

Para validar después de modificar:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Precios actuales: abre `base-de-datos/02_CONSULTAR_PRECIOS_CASAVIVA.sql`.

Modificar precios: usa `base-de-datos/03_MODIFICAR_PRECIO_CASAVIVA.sql`.

## Asistente de compras

El asistente de NexaTech está en `codigo/vistas/asistente-compra.tsx` y se muestra desde `codigo/principal.tsx`. Responde con reglas locales sobre productos, categorías, carrito, pagos, envíos y devoluciones. No usa API externa ni credenciales.

Para cambiar sus respuestas rápidas, edita la lista `sugerencias` y la función `responder` dentro de `codigo/vistas/asistente-compra.tsx`.

## Precios y base de datos

`codigo/datos/datos-demo.ts` contiene datos semilla/demo. Cambiar un precio ahí no modifica automáticamente una base de datos PostgreSQL que ya existe.

Para ver precios reales en PostgreSQL usa `base-de-datos/02_CONSULTAR_PRECIOS_CASAVIVA.sql`.

Para modificar precios existentes usa `base-de-datos/03_MODIFICAR_PRECIO_CASAVIVA.sql`. En el código y en la base, los precios se guardan en céntimos: `7900` significa `S/ 79.00`.
