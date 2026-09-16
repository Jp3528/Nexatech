--
-- PostgreSQL datosbase dump
--

-- Dumped from datosbase version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_configuracion('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: casaviva; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA casaviva;


--
-- Name: confirm_order_sale(); Type: FUNCTION; Schema: publico; Owner: -
--

CREATE FUNCTION publico.confirm_order_sale() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE item record; total_items bigint; snapshot_items json;
BEGIN
 IF OLD.status!='PENDING' OR NEW.status!='PAID' THEN RETURN NEW; END IF;
 SELECT SUM(price*quantity),json_agg(json_build_object('name',name,'sku',sku,'quantity',quantity,'price',price) ORDER BY id) INTO total_items,snapshot_items FROM order_items WHERE order_id=NEW.id;
 IF total_items IS NULL OR NEW.subtotal!=total_items THEN RAISE EXCEPTION 'order_totals_mismatch'; END IF;
 FOR item IN SELECT * FROM order_items WHERE order_id=NEW.id ORDER BY variant_id LOOP
  UPDATE variants SET stock=stock-item.quantity,reserved=reserved-item.quantity WHERE id=item.variant_id;
  INSERT INTO inventory_movements(id,variant_id,quantity,type,reason,reference,actor,created_at) VALUES ('sale-'||item.id,item.variant_id,-item.quantity,'OUT','Venta confirmada',NEW.id,'Pago verificado',NEW.paid_at);
 END LOOP;
 INSERT INTO invoices(order_id,series,issued_at,total,tax,snapshot) VALUES(NEW.id,NEW.issuer::json->>'series',NEW.paid_at,NEW.total,NEW.tax,json_build_object('orderId',NEW.id,'customerName',NEW.customer_name,'email',NEW.email,'address',NEW.address,'taxId',NEW.tax_id,'subtotal',NEW.subtotal,'discount',NEW.discount,'tax',NEW.tax,'taxBps',NEW.tax_bps,'shipping',NEW.shipping,'total',NEW.total,'currency',NEW.currency,'issuer',NEW.issuer::json,'items',snapshot_items)::text);
 INSERT INTO jobs(id,type,order_id,status,attempts,next_at,locked_until) VALUES('invoice-'||NEW.id,'INVOICE',NEW.id,'PENDING',0,NEW.paid_at,0);
 RETURN NEW;
END $$;


--
-- Name: customer_only_order(); Type: FUNCTION; Schema: publico; Owner: -
--

CREATE FUNCTION publico.customer_only_order() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.user_id AND role='CUSTOMER') THEN RAISE EXCEPTION 'customer_account_required'; END IF;
 RETURN NEW;
END $$;


--
-- Name: keep_one_admin(); Type: FUNCTION; Schema: publico; Owner: -
--

CREATE FUNCTION publico.keep_one_admin() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
 IF OLD.role='ADMIN' AND NEW.role!='ADMIN' THEN
  PERFORM pg_advisory_xact_lock(71391022);
  IF (SELECT count(*) FROM users WHERE role='ADMIN')<=1 THEN RAISE EXCEPTION 'last_admin_required'; END IF;
 END IF;
 RETURN NEW;
END $$;


--
-- Name: prohibit_change(); Type: FUNCTION; Schema: publico; Owner: -
--

CREATE FUNCTION publico.prohibit_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN RAISE EXCEPTION 'immutable_record'; END $$;


--
-- Name: release_order_reservation(); Type: FUNCTION; Schema: publico; Owner: -
--

CREATE FUNCTION publico.release_order_reservation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE item record;
BEGIN
 IF OLD.status='PENDING' AND NEW.status IN ('CANCELLED','REVIEW') THEN
  FOR item IN SELECT variant_id,quantity FROM order_items WHERE order_id=NEW.id ORDER BY variant_id LOOP
   UPDATE variants SET reserved=reserved-item.quantity WHERE id=item.variant_id;
  END LOOP;
 END IF;
 RETURN NEW;
END $$;


--
-- Name: reserve_order_item(); Type: FUNCTION; Schema: publico; Owner: -
--

CREATE FUNCTION publico.reserve_order_item() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE state text;
BEGIN
 SELECT status INTO state FROM orders WHERE id=NEW.order_id FOR UPDATE;
 IF state IS DISTINCT FROM 'PENDING' THEN RAISE EXCEPTION 'order_not_pending'; END IF;
 UPDATE variants SET reserved=reserved+NEW.quantity WHERE id=NEW.variant_id;
 RETURN NEW;
END $$;


--
-- Name: shipment_no_regression(); Type: FUNCTION; Schema: publico; Owner: -
--

CREATE FUNCTION publico.shipment_no_regression() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
 IF NEW.status='PREPARING' AND EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status IN ('SHIPPED','DELIVERED')) THEN RAISE EXCEPTION 'shipment_regression'; END IF;
 RETURN NEW;
END $$;


--
-- Name: valid_shipment(); Type: FUNCTION; Schema: publico; Owner: -
--

CREATE FUNCTION publico.valid_shipment() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE state text;
BEGIN
 SELECT status INTO state FROM orders WHERE id=NEW.order_id FOR UPDATE;
 IF state NOT IN ('PREPARING','SHIPPED','DELIVERED') OR NOT EXISTS(SELECT 1 FROM invoices WHERE order_id=NEW.order_id) THEN RAISE EXCEPTION 'shipment_requires_paid_order'; END IF;
 IF state='DELIVERED' AND NEW.status!='DELIVERED' THEN RAISE EXCEPTION 'shipment_already_delivered'; END IF;
 IF TG_OP='UPDATE' AND OLD.location_at IS NOT NULL AND NEW.location_at<OLD.location_at THEN RAISE EXCEPTION 'outdated_location'; END IF;
 RETURN NEW;
END $$;


--
-- Name: validate_order_transition(); Type: FUNCTION; Schema: publico; Owner: -
--

CREATE FUNCTION publico.validate_order_transition() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
 IF OLD.status=NEW.status THEN RETURN NEW; END IF;
 IF NOT ((OLD.status='PENDING' AND NEW.status IN ('PAID','CANCELLED','REVIEW')) OR (OLD.status='CANCELLED' AND NEW.status='REVIEW') OR (OLD.status='PAID' AND NEW.status IN ('PREPARING','REFUNDED')) OR (OLD.status='PREPARING' AND NEW.status IN ('SHIPPED','REFUNDED')) OR (OLD.status='SHIPPED' AND NEW.status IN ('DELIVERED','REFUNDED')) OR (OLD.status='DELIVERED' AND NEW.status='REFUNDED') OR (OLD.status='REVIEW' AND NEW.status='REFUNDED')) THEN RAISE EXCEPTION 'invalid_order_transition'; END IF;
 RETURN NEW;
END $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: mail_outbox; Type: TABLE; Schema: casaviva; Owner: -
--

CREATE TABLE casaviva.mail_outbox (
    key text NOT NULL,
    message jsonb NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    available_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migraciones; Type: TABLE; Schema: casaviva; Owner: -
--

CREATE TABLE casaviva.migraciones (
    version integer NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rate_limits; Type: TABLE; Schema: casaviva; Owner: -
--

CREATE TABLE casaviva.rate_limits (
    key text NOT NULL,
    count integer NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


--
-- Name: records; Type: TABLE; Schema: casaviva; Owner: -
--

CREATE TABLE casaviva.records (
    kind text NOT NULL,
    key text NOT NULL,
    datos jsonb NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT records_kind_check CHECK ((kind = ANY (ARRAY['products'::text, 'rooms'::text, 'coupons'::text, 'users'::text, 'orders'::text, 'subscriptions'::text, 'credentials'::text, 'carts'::text, 'favorites'::text, 'resets'::text])))
);


--
-- Name: sessions; Type: TABLE; Schema: casaviva; Owner: -
--

CREATE TABLE casaviva.sessions (
    token_hash text NOT NULL,
    user_id text,
    guest_key text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: store; Type: TABLE; Schema: casaviva; Owner: -
--

CREATE TABLE casaviva.store (
    id integer NOT NULL,
    datos jsonb NOT NULL,
    demo boolean NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_datos_check CHECK ((jsonb_typeof(datos) = 'object'::text)),
    CONSTRAINT store_id_check CHECK ((id = 1))
);


--
-- Name: carts; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.carts (
    user_id text NOT NULL,
    items text NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.categories (
    id text NOT NULL,
    name text NOT NULL
);


--
-- Name: inventory_movements; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.inventory_movements (
    id text NOT NULL,
    variant_id text NOT NULL,
    quantity bigint NOT NULL,
    type text NOT NULL,
    reason text NOT NULL,
    reference text,
    actor text NOT NULL,
    created_at bigint NOT NULL
);


--
-- Name: invoices; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.invoices (
    id bigint NOT NULL,
    order_id text NOT NULL,
    series text DEFAULT 'DEMO'::text NOT NULL,
    issued_at bigint NOT NULL,
    total bigint NOT NULL,
    tax bigint NOT NULL,
    snapshot text NOT NULL,
    pdf_key text,
    hash text
);


--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: publico; Owner: -
--

ALTER TABLE publico.invoices ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME publico.invoices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: jobs; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.jobs (
    id text NOT NULL,
    type text NOT NULL,
    order_id text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    attempts bigint DEFAULT 0 NOT NULL,
    next_at bigint NOT NULL,
    locked_until bigint DEFAULT 0 NOT NULL,
    last_error text
);


--
-- Name: notification_reads; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.notification_reads (
    user_id text NOT NULL,
    notification_id text NOT NULL
);


--
-- Name: order_items; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.order_items (
    id text NOT NULL,
    order_id text NOT NULL,
    variant_id text NOT NULL,
    name text NOT NULL,
    sku text NOT NULL,
    quantity bigint NOT NULL,
    price bigint NOT NULL,
    cost bigint NOT NULL,
    CONSTRAINT item_valid CHECK (((quantity > 0) AND (quantity <= 20) AND (price > 0)))
);


--
-- Name: order_messages; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.order_messages (
    id text NOT NULL,
    order_id text NOT NULL,
    user_id text NOT NULL,
    message text NOT NULL,
    created_at bigint NOT NULL,
    CONSTRAINT order_messages_message_check CHECK (((length(message) >= 1) AND (length(message) <= 1500)))
);


--
-- Name: orders; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.orders (
    id text NOT NULL,
    user_id text NOT NULL,
    request_key text NOT NULL,
    request_hash text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    customer_name text NOT NULL,
    email text NOT NULL,
    address text NOT NULL,
    tax_id text NOT NULL,
    subtotal bigint NOT NULL,
    discount bigint NOT NULL,
    tax bigint NOT NULL,
    tax_bps bigint NOT NULL,
    shipping bigint NOT NULL,
    total bigint NOT NULL,
    created_at bigint NOT NULL,
    expires_at bigint NOT NULL,
    paid_at bigint,
    issuer text NOT NULL,
    currency text DEFAULT 'pen'::text NOT NULL,
    CONSTRAINT order_status CHECK ((status = ANY (ARRAY['PENDING'::text, 'PAID'::text, 'PREPARING'::text, 'SHIPPED'::text, 'DELIVERED'::text, 'CANCELLED'::text, 'REFUNDED'::text, 'REVIEW'::text]))),
    CONSTRAINT order_total CHECK (((total = (((subtotal - discount) + tax) + shipping)) AND (total > 0) AND (discount >= 0) AND (discount <= subtotal)))
);


--
-- Name: password_resets; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.password_resets (
    token_hash text NOT NULL,
    user_id text NOT NULL,
    expires_at bigint NOT NULL,
    created_at bigint NOT NULL
);


--
-- Name: payment_events; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.payment_events (
    id text NOT NULL,
    order_id text NOT NULL,
    type text NOT NULL,
    created_at bigint NOT NULL
);


--
-- Name: payment_transactions; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.payment_transactions (
    id text NOT NULL,
    order_id text NOT NULL,
    provider text NOT NULL,
    transaction_id text NOT NULL,
    status text NOT NULL,
    amount bigint NOT NULL,
    raw_response text NOT NULL,
    created_at bigint NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.products (
    id text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    brand text NOT NULL,
    description text NOT NULL,
    image text NOT NULL,
    tag text NOT NULL
);


--
-- Name: rate_limits; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.rate_limits (
    key text NOT NULL,
    count bigint NOT NULL,
    expires_at bigint NOT NULL
);


--
-- Name: revistas; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.revistas (
    id text NOT NULL,
    user_id text NOT NULL,
    product_id text NOT NULL,
    rating bigint NOT NULL,
    comment text NOT NULL,
    created_at bigint NOT NULL,
    CONSTRAINT review_rating CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: schema_migraciones; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.schema_migraciones (
    name text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: security_events; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.security_events (
    id text NOT NULL,
    event text NOT NULL,
    subject text NOT NULL,
    success integer NOT NULL,
    created_at bigint NOT NULL,
    CONSTRAINT security_events_success_check CHECK ((success = ANY (ARRAY[0, 1])))
);


--
-- Name: sessions; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.sessions (
    token text NOT NULL,
    user_id text NOT NULL,
    expires_at bigint NOT NULL
);


--
-- Name: shipment_events; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.shipment_events (
    id text NOT NULL,
    order_id text NOT NULL,
    status text NOT NULL,
    note text NOT NULL,
    actor text NOT NULL,
    source text NOT NULL,
    created_at bigint NOT NULL
);


--
-- Name: shipments; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.shipments (
    order_id text NOT NULL,
    carrier text DEFAULT ''::text NOT NULL,
    tracking_number text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'PREPARING'::text NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    contact_phone text DEFAULT ''::text NOT NULL,
    tracking_url text DEFAULT ''::text NOT NULL,
    latitude double precision,
    longitude double precision,
    location_at bigint,
    updated_at bigint NOT NULL,
    source text DEFAULT 'MANUAL'::text NOT NULL,
    tracking_code text DEFAULT ''::text NOT NULL,
    CONSTRAINT shipments_check CHECK (((latitude IS NULL) = (longitude IS NULL))),
    CONSTRAINT shipments_check1 CHECK (((latitude IS NULL) = (location_at IS NULL))),
    CONSTRAINT shipments_latitude_check CHECK (((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision))),
    CONSTRAINT shipments_longitude_check CHECK (((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision))),
    CONSTRAINT shipments_source_check CHECK ((source = ANY (ARRAY['MANUAL'::text, 'CARRIER'::text]))),
    CONSTRAINT shipments_status_check CHECK ((status = ANY (ARRAY['PREPARING'::text, 'SHIPPED'::text, 'OUT_FOR_DELIVERY'::text, 'DELAYED'::text, 'INCIDENT'::text, 'DELIVERED'::text])))
);


--
-- Name: shipping_webhooks; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.shipping_webhooks (
    id text NOT NULL,
    received_at bigint NOT NULL
);


--
-- Name: stock_alerts; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.stock_alerts (
    variant_id text NOT NULL,
    last_sent bigint DEFAULT 0 NOT NULL,
    locked_until bigint DEFAULT 0 NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.users (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role text DEFAULT 'CUSTOMER'::text NOT NULL,
    created_at bigint NOT NULL,
    CONSTRAINT role_allowed CHECK ((role = ANY (ARRAY['ADMIN'::text, 'EMPLOYEE'::text, 'WAREHOUSE_MANAGER'::text, 'CUSTOMER'::text])))
);


--
-- Name: variants; Type: TABLE; Schema: publico; Owner: -
--

CREATE TABLE publico.variants (
    id text NOT NULL,
    product_id text NOT NULL,
    sku text NOT NULL,
    barcode text,
    color text NOT NULL,
    attributes text DEFAULT '{}'::text NOT NULL,
    price bigint NOT NULL,
    cost bigint NOT NULL,
    stock bigint NOT NULL,
    reserved bigint DEFAULT 0 NOT NULL,
    minimum bigint DEFAULT 6 NOT NULL,
    CONSTRAINT prices_positive CHECK (((price > 0) AND (cost >= 0) AND (minimum >= 0))),
    CONSTRAINT stock_consistent CHECK (((stock >= 0) AND (reserved >= 0) AND (reserved <= stock)))
);


--
-- Name: mail_outbox mail_outbox_pkey; Type: CONSTRAINT; Schema: casaviva; Owner: -
--

ALTER TABLE ONLY casaviva.mail_outbox
    ADD CONSTRAINT mail_outbox_pkey PRIMARY KEY (key);


--
-- Name: migraciones migraciones_pkey; Type: CONSTRAINT; Schema: casaviva; Owner: -
--

ALTER TABLE ONLY casaviva.migraciones
    ADD CONSTRAINT migraciones_pkey PRIMARY KEY (version);


--
-- Name: rate_limits rate_limits_pkey; Type: CONSTRAINT; Schema: casaviva; Owner: -
--

ALTER TABLE ONLY casaviva.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (key);


--
-- Name: records records_pkey; Type: CONSTRAINT; Schema: casaviva; Owner: -
--

ALTER TABLE ONLY casaviva.records
    ADD CONSTRAINT records_pkey PRIMARY KEY (kind, key);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: casaviva; Owner: -
--

ALTER TABLE ONLY casaviva.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (token_hash);


--
-- Name: store store_pkey; Type: CONSTRAINT; Schema: casaviva; Owner: -
--

ALTER TABLE ONLY casaviva.store
    ADD CONSTRAINT store_pkey PRIMARY KEY (id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (user_id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: notification_reads notification_reads_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.notification_reads
    ADD CONSTRAINT notification_reads_pkey PRIMARY KEY (user_id, notification_id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_messages order_messages_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.order_messages
    ADD CONSTRAINT order_messages_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (token_hash);


--
-- Name: payment_events payment_events_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.payment_events
    ADD CONSTRAINT payment_events_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: rate_limits rate_limits_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (key);


--
-- Name: revistas revistas_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.revistas
    ADD CONSTRAINT revistas_pkey PRIMARY KEY (id);


--
-- Name: schema_migraciones schema_migraciones_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.schema_migraciones
    ADD CONSTRAINT schema_migraciones_pkey PRIMARY KEY (name);


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (token);


--
-- Name: shipment_events shipment_events_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.shipment_events
    ADD CONSTRAINT shipment_events_pkey PRIMARY KEY (id);


--
-- Name: shipments shipments_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.shipments
    ADD CONSTRAINT shipments_pkey PRIMARY KEY (order_id);


--
-- Name: shipping_webhooks shipping_webhooks_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.shipping_webhooks
    ADD CONSTRAINT shipping_webhooks_pkey PRIMARY KEY (id);


--
-- Name: stock_alerts stock_alerts_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.stock_alerts
    ADD CONSTRAINT stock_alerts_pkey PRIMARY KEY (variant_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: variants variants_pkey; Type: CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.variants
    ADD CONSTRAINT variants_pkey PRIMARY KEY (id);


--
-- Name: customer_email; Type: INDEX; Schema: casaviva; Owner: -
--

CREATE UNIQUE INDEX customer_email ON casaviva.records USING btree (lower((datos ->> 'email'::text))) WHERE (kind = 'users'::text);


--
-- Name: mail_pending; Type: INDEX; Schema: casaviva; Owner: -
--

CREATE INDEX mail_pending ON casaviva.mail_outbox USING btree (available_at) WHERE (sent_at IS NULL);


--
-- Name: order_idempotency; Type: INDEX; Schema: casaviva; Owner: -
--

CREATE UNIQUE INDEX order_idempotency ON casaviva.records USING btree (((datos ->> 'userId'::text)), ((datos ->> 'key'::text))) WHERE (kind = 'orders'::text);


--
-- Name: own_orders; Type: INDEX; Schema: casaviva; Owner: -
--

CREATE INDEX own_orders ON casaviva.records USING btree (((datos ->> 'userId'::text))) WHERE (kind = 'orders'::text);


--
-- Name: sessions_expiry; Type: INDEX; Schema: casaviva; Owner: -
--

CREATE INDEX sessions_expiry ON casaviva.sessions USING btree (expires_at);


--
-- Name: sessions_user; Type: INDEX; Schema: casaviva; Owner: -
--

CREATE INDEX sessions_user ON casaviva.sessions USING btree (user_id);


--
-- Name: categories_name_unique; Type: INDEX; Schema: publico; Owner: -
--

CREATE UNIQUE INDEX categories_name_unique ON publico.categories USING btree (name);


--
-- Name: invoices_order_id_unique; Type: INDEX; Schema: publico; Owner: -
--

CREATE UNIQUE INDEX invoices_order_id_unique ON publico.invoices USING btree (order_id);


--
-- Name: items_order_variant; Type: INDEX; Schema: publico; Owner: -
--

CREATE UNIQUE INDEX items_order_variant ON publico.order_items USING btree (order_id, variant_id);


--
-- Name: jobs_due; Type: INDEX; Schema: publico; Owner: -
--

CREATE INDEX jobs_due ON publico.jobs USING btree (status, next_at);


--
-- Name: movements_variant_date; Type: INDEX; Schema: publico; Owner: -
--

CREATE INDEX movements_variant_date ON publico.inventory_movements USING btree (variant_id, created_at);


--
-- Name: order_items_variant; Type: INDEX; Schema: publico; Owner: -
--

CREATE INDEX order_items_variant ON publico.order_items USING btree (variant_id, order_id);


--
-- Name: order_messages_order; Type: INDEX; Schema: publico; Owner: -
--

CREATE INDEX order_messages_order ON publico.order_messages USING btree (order_id, created_at);


--
-- Name: orders_paid_at; Type: INDEX; Schema: publico; Owner: -
--

CREATE INDEX orders_paid_at ON publico.orders USING btree (paid_at) WHERE (status = ANY (ARRAY['PAID'::text, 'PREPARING'::text, 'SHIPPED'::text, 'DELIVERED'::text]));


--
-- Name: orders_recent; Type: INDEX; Schema: publico; Owner: -
--

CREATE INDEX orders_recent ON publico.orders USING btree (created_at DESC);


--
-- Name: orders_request_key_unique; Type: INDEX; Schema: publico; Owner: -
--

CREATE UNIQUE INDEX orders_request_key_unique ON publico.orders USING btree (request_key);


--
-- Name: orders_status_expiry; Type: INDEX; Schema: publico; Owner: -
--

CREATE INDEX orders_status_expiry ON publico.orders USING btree (status, expires_at);


--
-- Name: orders_user; Type: INDEX; Schema: publico; Owner: -
--

CREATE INDEX orders_user ON publico.orders USING btree (user_id, created_at);


--
-- Name: password_resets_expiry; Type: INDEX; Schema: publico; Owner: -
--

CREATE INDEX password_resets_expiry ON publico.password_resets USING btree (expires_at);


--
-- Name: password_resets_user; Type: INDEX; Schema: publico; Owner: -
--

CREATE INDEX password_resets_user ON publico.password_resets USING btree (user_id);


--
-- Name: payment_transactions_transaction_id_unique; Type: INDEX; Schema: publico; Owner: -
--

CREATE UNIQUE INDEX payment_transactions_transaction_id_unique ON publico.payment_transactions USING btree (transaction_id);


--
-- Name: payments_order; Type: INDEX; Schema: publico; Owner: -
--

CREATE INDEX payments_order ON publico.payment_transactions USING btree (order_id);


--
-- Name: products_brand; Type: INDEX; Schema: publico; Owner: -
--

CREATE INDEX products_brand ON publico.products USING btree (brand);


--
-- Name: products_category; Type: INDEX; Schema: publico; Owner: -
--

CREATE INDEX products_category ON publico.products USING btree (category);


--
-- Name: revistas_product; Type: INDEX; Schema: publico; Owner: -
--

CREATE INDEX revistas_product ON publico.revistas USING btree (product_id, created_at DESC);


--
-- Name: revistas_user_product; Type: INDEX; Schema: publico; Owner: -
--

CREATE UNIQUE INDEX revistas_user_product ON publico.revistas USING btree (user_id, product_id);


--
-- Name: security_events_recent; Type: INDEX; Schema: publico; Owner: -
--

CREATE INDEX security_events_recent ON publico.security_events USING btree (created_at DESC);


--
-- Name: sessions_expiry; Type: INDEX; Schema: publico; Owner: -
--

CREATE INDEX sessions_expiry ON publico.sessions USING btree (expires_at);


--
-- Name: sessions_user; Type: INDEX; Schema: publico; Owner: -
--

CREATE INDEX sessions_user ON publico.sessions USING btree (user_id);


--
-- Name: shipment_events_order; Type: INDEX; Schema: publico; Owner: -
--

CREATE INDEX shipment_events_order ON publico.shipment_events USING btree (order_id, created_at DESC);


--
-- Name: users_email_unique; Type: INDEX; Schema: publico; Owner: -
--

CREATE UNIQUE INDEX users_email_unique ON publico.users USING btree (email);


--
-- Name: variants_price; Type: INDEX; Schema: publico; Owner: -
--

CREATE INDEX variants_price ON publico.variants USING btree (price, product_id);


--
-- Name: variants_product; Type: INDEX; Schema: publico; Owner: -
--

CREATE INDEX variants_product ON publico.variants USING btree (product_id);


--
-- Name: variants_sku_unique; Type: INDEX; Schema: publico; Owner: -
--

CREATE UNIQUE INDEX variants_sku_unique ON publico.variants USING btree (sku);


--
-- Name: orders confirm_sale; Type: TRIGGER; Schema: publico; Owner: -
--

CREATE TRIGGER confirm_sale AFTER UPDATE OF status ON publico.orders FOR EACH ROW EXECUTE FUNCTION publico.confirm_order_sale();


--
-- Name: orders customer_orders; Type: TRIGGER; Schema: publico; Owner: -
--

CREATE TRIGGER customer_orders BEFORE INSERT ON publico.orders FOR EACH ROW EXECUTE FUNCTION publico.customer_only_order();


--
-- Name: shipments guard_shipment; Type: TRIGGER; Schema: publico; Owner: -
--

CREATE TRIGGER guard_shipment BEFORE INSERT OR UPDATE ON publico.shipments FOR EACH ROW EXECUTE FUNCTION publico.valid_shipment();


--
-- Name: invoices immutable_invoice_delete; Type: TRIGGER; Schema: publico; Owner: -
--

CREATE TRIGGER immutable_invoice_delete BEFORE DELETE ON publico.invoices FOR EACH ROW EXECUTE FUNCTION publico.prohibit_change();


--
-- Name: invoices immutable_invoice_fields; Type: TRIGGER; Schema: publico; Owner: -
--

CREATE TRIGGER immutable_invoice_fields BEFORE UPDATE OF id, order_id, series, issued_at, total, tax, snapshot ON publico.invoices FOR EACH ROW EXECUTE FUNCTION publico.prohibit_change();


--
-- Name: order_items immutable_item; Type: TRIGGER; Schema: publico; Owner: -
--

CREATE TRIGGER immutable_item BEFORE DELETE OR UPDATE ON publico.order_items FOR EACH ROW EXECUTE FUNCTION publico.prohibit_change();


--
-- Name: inventory_movements immutable_movement; Type: TRIGGER; Schema: publico; Owner: -
--

CREATE TRIGGER immutable_movement BEFORE DELETE OR UPDATE ON publico.inventory_movements FOR EACH ROW EXECUTE FUNCTION publico.prohibit_change();


--
-- Name: orders immutable_order_financials; Type: TRIGGER; Schema: publico; Owner: -
--

CREATE TRIGGER immutable_order_financials BEFORE UPDATE OF user_id, request_key, request_hash, customer_name, email, address, tax_id, subtotal, discount, tax, tax_bps, shipping, total, created_at, expires_at, issuer, currency ON publico.orders FOR EACH ROW EXECUTE FUNCTION publico.prohibit_change();


--
-- Name: security_events immutable_security_event; Type: TRIGGER; Schema: publico; Owner: -
--

CREATE TRIGGER immutable_security_event BEFORE DELETE OR UPDATE ON publico.security_events FOR EACH ROW EXECUTE FUNCTION publico.prohibit_change();


--
-- Name: shipment_events immutable_shipping_events; Type: TRIGGER; Schema: publico; Owner: -
--

CREATE TRIGGER immutable_shipping_events BEFORE DELETE OR UPDATE ON publico.shipment_events FOR EACH ROW EXECUTE FUNCTION publico.prohibit_change();


--
-- Name: shipments prevent_shipping_regression; Type: TRIGGER; Schema: publico; Owner: -
--

CREATE TRIGGER prevent_shipping_regression BEFORE INSERT OR UPDATE ON publico.shipments FOR EACH ROW EXECUTE FUNCTION publico.shipment_no_regression();


--
-- Name: users protect_last_admin; Type: TRIGGER; Schema: publico; Owner: -
--

CREATE TRIGGER protect_last_admin BEFORE UPDATE OF role ON publico.users FOR EACH ROW EXECUTE FUNCTION publico.keep_one_admin();


--
-- Name: orders release_reservation; Type: TRIGGER; Schema: publico; Owner: -
--

CREATE TRIGGER release_reservation AFTER UPDATE OF status ON publico.orders FOR EACH ROW EXECUTE FUNCTION publico.release_order_reservation();


--
-- Name: order_items reserve_item; Type: TRIGGER; Schema: publico; Owner: -
--

CREATE TRIGGER reserve_item AFTER INSERT ON publico.order_items FOR EACH ROW EXECUTE FUNCTION publico.reserve_order_item();


--
-- Name: orders valid_order_transition; Type: TRIGGER; Schema: publico; Owner: -
--

CREATE TRIGGER valid_order_transition BEFORE UPDATE OF status ON publico.orders FOR EACH ROW EXECUTE FUNCTION publico.validate_order_transition();


--
-- Name: carts carts_user_id_fkey; Type: FK CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.carts
    ADD CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES publico.users(id);


--
-- Name: inventory_movements inventory_movements_variant_id_fkey; Type: FK CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.inventory_movements
    ADD CONSTRAINT inventory_movements_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES publico.variants(id);


--
-- Name: invoices invoices_order_id_fkey; Type: FK CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.invoices
    ADD CONSTRAINT invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES publico.orders(id);


--
-- Name: jobs jobs_order_id_fkey; Type: FK CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.jobs
    ADD CONSTRAINT jobs_order_id_fkey FOREIGN KEY (order_id) REFERENCES publico.orders(id);


--
-- Name: notification_reads notification_reads_user_id_fkey; Type: FK CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.notification_reads
    ADD CONSTRAINT notification_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES publico.users(id);


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES publico.orders(id);


--
-- Name: order_items order_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.order_items
    ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES publico.variants(id);


--
-- Name: order_messages order_messages_order_id_fkey; Type: FK CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.order_messages
    ADD CONSTRAINT order_messages_order_id_fkey FOREIGN KEY (order_id) REFERENCES publico.orders(id);


--
-- Name: order_messages order_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.order_messages
    ADD CONSTRAINT order_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES publico.users(id);


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES publico.users(id);


--
-- Name: password_resets password_resets_user_id_fkey; Type: FK CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.password_resets
    ADD CONSTRAINT password_resets_user_id_fkey FOREIGN KEY (user_id) REFERENCES publico.users(id) ON DELETE CASCADE;


--
-- Name: payment_events payment_events_order_id_fkey; Type: FK CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.payment_events
    ADD CONSTRAINT payment_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES publico.orders(id);


--
-- Name: payment_transactions payment_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.payment_transactions
    ADD CONSTRAINT payment_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES publico.orders(id);


--
-- Name: products products_category_fkey; Type: FK CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.products
    ADD CONSTRAINT products_category_fkey FOREIGN KEY (category) REFERENCES publico.categories(id);


--
-- Name: revistas revistas_product_id_fkey; Type: FK CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.revistas
    ADD CONSTRAINT revistas_product_id_fkey FOREIGN KEY (product_id) REFERENCES publico.products(id);


--
-- Name: revistas revistas_user_id_fkey; Type: FK CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.revistas
    ADD CONSTRAINT revistas_user_id_fkey FOREIGN KEY (user_id) REFERENCES publico.users(id);


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES publico.users(id);


--
-- Name: shipment_events shipment_events_order_id_fkey; Type: FK CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.shipment_events
    ADD CONSTRAINT shipment_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES publico.orders(id);


--
-- Name: shipments shipments_order_id_fkey; Type: FK CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.shipments
    ADD CONSTRAINT shipments_order_id_fkey FOREIGN KEY (order_id) REFERENCES publico.orders(id);


--
-- Name: stock_alerts stock_alerts_variant_id_fkey; Type: FK CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.stock_alerts
    ADD CONSTRAINT stock_alerts_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES publico.variants(id);


--
-- Name: variants variants_product_id_fkey; Type: FK CONSTRAINT; Schema: publico; Owner: -
--

ALTER TABLE ONLY publico.variants
    ADD CONSTRAINT variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES publico.products(id);


--
-- PostgreSQL datosbase dump complete
--


