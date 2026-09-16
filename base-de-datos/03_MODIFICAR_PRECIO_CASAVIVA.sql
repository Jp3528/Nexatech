-- Ejecutar conectado a nexo_store. Editar SOLO los tres valores indicados.
-- No hace cambios mientras precio_soles sea NULL.
-- Los valores se escriben EN SOLES, por ejemplo 85.00; se guardan en centimos.
-- Ejemplo de variante existente: cv-0-natural (cojin, variante Arena).
-- precio_anterior_soles = NULL quita el precio tachado de esta variante.
-- Para mantener una oferta, escribir un precio anterior mayor al precio actual.
-- El cambio afecta al catalogo; los pedidos existentes conservan sus importes.
DO $cambio_precio$
DECLARE
    variante_id text := '[ID_VARIANTE]';       -- EDITAR: copiar de la consulta 02.
    precio_soles numeric := NULL;             -- EDITAR: nuevo precio, p. ej. 85.00.
    precio_anterior_soles numeric := NULL;     -- EDITAR: precio tachado o NULL.
    fila record;
    posicion integer;
    coincidencias integer;
    contenido jsonb;
    variante jsonb;
BEGIN
    IF variante_id = '[ID_VARIANTE]' OR precio_soles IS NULL THEN
        RAISE EXCEPTION 'Completa variante_id y precio_soles antes de ejecutar.';
    END IF;
    IF precio_soles <= 0 OR precio_soles > 10000000
       OR precio_soles * 100 <> trunc(precio_soles * 100) THEN
        RAISE EXCEPTION 'El precio debe ser positivo, hasta 10000000 soles y con maximo dos decimales.';
    END IF;
    IF precio_anterior_soles IS NOT NULL AND
       (precio_anterior_soles <= precio_soles OR precio_anterior_soles > 10000000
        OR precio_anterior_soles * 100 <> trunc(precio_anterior_soles * 100)) THEN
        RAISE EXCEPTION 'El precio anterior debe ser mayor al actual, hasta 10000000 soles y con maximo dos decimales.';
    END IF;

    -- Bloquea la fila del producto; no sobrescribe modificaciones concurrentes.
    SELECT r.key, r.datos INTO STRICT fila
    FROM casaviva.records r
    WHERE r.kind = 'products'
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(r.datos->'variants') v
                  WHERE v->>'id' = variante_id)
    FOR UPDATE;

    SELECT count(*)::integer, min(n - 1)::integer INTO coincidencias, posicion
    FROM jsonb_array_elements(fila.datos->'variants') WITH ORDINALITY AS x(v, n)
    WHERE v->>'id' = variante_id;
    IF coincidencias <> 1 THEN
        RAISE EXCEPTION 'La variante no es unica. No se modifico el producto.';
    END IF;

    variante := fila.datos->'variants'->posicion;
    variante := jsonb_set(variante, '{price}', to_jsonb((precio_soles * 100)::bigint));
    IF precio_anterior_soles IS NULL THEN
        variante := variante - 'previousPrice';
    ELSE
        variante := jsonb_set(variante, '{previousPrice}',
                             to_jsonb((precio_anterior_soles * 100)::bigint));
    END IF;
    contenido := jsonb_set(fila.datos, ARRAY['variants', posicion::text], variante);
    UPDATE casaviva.records
    SET datos = contenido, updated_at = now()
    WHERE kind = 'products' AND key = fila.key;
    RAISE NOTICE 'Precio actualizado para %: S/ %', variante_id, precio_soles;
END
$cambio_precio$;
