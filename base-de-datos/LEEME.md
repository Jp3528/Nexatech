# Base de datos Nexo y CasaViva

Servidor PostgreSQL 17, puerto 5432, base `nexo_store`.

- `01_ESTRUCTURA_NEXO_Y_CASAVIVA.sql`: exportacion de la estructura actual completa de la base: esquemas, tablas, funciones, restricciones e indices. No contiene registros, contraseñas ni asignaciones de propietario/permisos. Incluye Nexo (`publico`) y CasaViva (`casaviva`). Es un respaldo de estructura para revisar o restaurar en una base vacia; NO ejecutarlo sobre la base existente. Algunos comandos de la exportacion son propios de psql.
- `02_CONSULTAR_PRECIOS_CASAVIVA.sql`: muestra productos, variantes, precios en soles y stock.
- `03_MODIFICAR_PRECIO_CASAVIVA.sql`: modifica una variante, con validaciones y bloqueo de la fila. No hace cambios hasta completar los valores. El precio anterior es opcional: NULL elimina el precio tachado.

## Cambiar un precio desde pgAdmin

1. Selecciona `nexo_store`, clic derecho → Query Tool.
2. Abre el archivo 02 con el icono de carpeta y ejecutalo (F5). Copia el `variante_id` deseado.
3. Abre el archivo 03. Cambia `[ID_VARIANTE]`, el nuevo `precio_soles` y, si corresponde, `precio_anterior_soles`. Ejemplo: `cv-0-natural` y `85.00` son el cojin Arena y un precio ilustrativo de S/ 85; no son una instruccion para aplicar ese precio.
4. Ejecuta el archivo 03 (F5). Con Auto commit activo, se guarda al finalizar correctamente. Si lo tienes desactivado, pulsa Commit para guardar o Rollback para descartar.
5. Ejecuta de nuevo la consulta 02 y recarga la tienda para ver el resultado.

El script se probo dentro de una transaccion revertida: no se cambiaron precios reales durante la preparacion. Los pedidos ya creados conservan los precios de compra. La columna `datos` de `casaviva.records` almacena cada producto como JSONB; el precio corresponde a `variants[].price`, en centimos.

La web activa utiliza el codigo de Documents/JEAN/ecommerce/casaviva y la base compartida `nexo_store`. Ejecutar estos SQL en esa base afectara a esa tienda. La carpeta del escritorio no contiene una base independiente.
