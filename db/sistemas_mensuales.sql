CREATE TABLE IF NOT EXISTS public.sistemas_mensuales (
  id SERIAL PRIMARY KEY,
  nombre_cliente TEXT NOT NULL,
  sistema_slug TEXT NOT NULL UNIQUE,
  db_schema TEXT NOT NULL UNIQUE,
  url_sistema TEXT,
  monto_mensual NUMERIC(12, 2) NOT NULL DEFAULT 0,
  fecha_vencimiento DATE NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  notas TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sistema_pagos (
  id SERIAL PRIMARY KEY,
  sistema_id INTEGER NOT NULL REFERENCES public.sistemas_mensuales(id) ON DELETE CASCADE,
  mes_pagado DATE NOT NULL,
  monto NUMERIC(12, 2) NOT NULL,
  fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
  observacion TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sistemas_mensuales_schema
ON public.sistemas_mensuales(db_schema);

CREATE INDEX IF NOT EXISTS idx_sistema_pagos_sistema
ON public.sistema_pagos(sistema_id);

INSERT INTO public.sistemas_mensuales
  (nombre_cliente, sistema_slug, db_schema, url_sistema, monto_mensual, fecha_vencimiento, activo)
VALUES
  ('Alejandro Vega', 'alejandro-vega', 'alejandro_vega', '', 0, CURRENT_DATE + INTERVAL '30 days', TRUE)
ON CONFLICT (db_schema) DO NOTHING;
