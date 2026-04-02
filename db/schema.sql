CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  codigo_barras TEXT NOT NULL DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 0,
  precio NUMERIC(12, 2) NOT NULL DEFAULT 0,
  precio_costo NUMERIC(12, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ventas (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NULL REFERENCES productos(id) ON DELETE SET NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  fecha TIMESTAMP NOT NULL DEFAULT NOW(),
  nombre_manual TEXT NULL,
  precio_manual NUMERIC(12, 2) NULL,
  tipo_pago TEXT NOT NULL,
  dni_cliente TEXT NULL,
  nombre_producto TEXT NULL,
  precio_unitario NUMERIC(12, 2) NULL,
  costo_unitario NUMERIC(12, 2) NULL
);

CREATE TABLE IF NOT EXISTS reparaciones (
  id SERIAL PRIMARY KEY,
  nombre_servicio TEXT NOT NULL,
  precio NUMERIC(12, 2) NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  tipo_pago TEXT NOT NULL,
  dni_cliente TEXT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mercaderia_fallada (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT NOW(),
  descripcion TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS equipos (
  id SERIAL PRIMARY KEY,
  tipo_reparacion TEXT NOT NULL,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  tecnico TEXT NOT NULL,
  monto NUMERIC(12, 2) NOT NULL,
  nombre_cliente TEXT NOT NULL,
  telefono TEXT NOT NULL,
  nro_orden TEXT NOT NULL UNIQUE,
  fecha DATE NOT NULL,
  hora TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Por Reparar',
  observaciones TEXT NULL,
  firma_cliente TEXT NULL
);

CREATE TABLE IF NOT EXISTS egresos (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  monto NUMERIC(12, 2) NOT NULL,
  descripcion TEXT NOT NULL,
  tipo_pago TEXT NOT NULL,
  tipo_egreso TEXT NOT NULL DEFAULT 'general',
  equipo_id INTEGER NULL REFERENCES equipos(id) ON DELETE SET NULL
);
