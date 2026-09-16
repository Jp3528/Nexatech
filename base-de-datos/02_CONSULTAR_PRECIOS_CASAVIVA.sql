-- Ejecutar en Query Tool de la base nexo_store (PostgreSQL 17, puerto 5432).
-- Solo consulta: no modifica datos.
SELECT
    r.key AS producto_id,
    r.datos->>'name' AS producto,
    v->>'id' AS variante_id,
    v->>'name' AS variante,
    round((v->>'price')::numeric / 100, 2) AS precio_soles,
    round((v->>'previousPrice')::numeric / 100, 2) AS precio_anterior_soles,
    (v->'inventory'->>'stock')::integer AS stock,
    (v->'inventory'->>'reserved')::integer AS reservado
FROM casaviva.records AS r
CROSS JOIN LATERAL jsonb_array_elements(r.datos->'variants') AS v
WHERE r.kind = 'products'
ORDER BY r.datos->>'name', v->>'name';
