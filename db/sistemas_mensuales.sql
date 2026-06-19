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

ALTER TABLE public.sistemas_mensuales
ADD COLUMN IF NOT EXISTS nombre_cliente TEXT,
ADD COLUMN IF NOT EXISTS sistema_slug TEXT,
ADD COLUMN IF NOT EXISTS db_schema TEXT,
ADD COLUMN IF NOT EXISTS url_sistema TEXT,
ADD COLUMN IF NOT EXISTS monto_mensual NUMERIC(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE,
ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notas TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

UPDATE public.sistemas_mensuales
SET nombre_cliente = COALESCE(nombre_cliente, 'Sin nombre'),
    sistema_slug = COALESCE(sistema_slug, 'sistema-' || id::text),
    db_schema = COALESCE(db_schema, 'schema_' || id::text),
    fecha_vencimiento = COALESCE(fecha_vencimiento, CURRENT_DATE + INTERVAL '30 days')
WHERE nombre_cliente IS NULL
   OR sistema_slug IS NULL
   OR db_schema IS NULL
   OR fecha_vencimiento IS NULL;

ALTER TABLE public.sistemas_mensuales
ALTER COLUMN nombre_cliente SET NOT NULL,
ALTER COLUMN sistema_slug SET NOT NULL,
ALTER COLUMN db_schema SET NOT NULL,
ALTER COLUMN fecha_vencimiento SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.sistema_pagos (
  id SERIAL PRIMARY KEY,
  sistema_id INTEGER NOT NULL REFERENCES public.sistemas_mensuales(id) ON DELETE CASCADE,
  mes_pagado DATE NOT NULL,
  monto NUMERIC(12, 2) NOT NULL,
  fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
  observacion TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sistema_pagos
ADD COLUMN IF NOT EXISTS sistema_id INTEGER,
ADD COLUMN IF NOT EXISTS mes_pagado DATE NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS monto NUMERIC(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS observacion TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sistemas_mensuales_sistema_slug_key'
      AND conrelid = 'public.sistemas_mensuales'::regclass
  ) THEN
    ALTER TABLE public.sistemas_mensuales
    ADD CONSTRAINT sistemas_mensuales_sistema_slug_key UNIQUE (sistema_slug);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sistemas_mensuales_db_schema_key'
      AND conrelid = 'public.sistemas_mensuales'::regclass
  ) THEN
    ALTER TABLE public.sistemas_mensuales
    ADD CONSTRAINT sistemas_mensuales_db_schema_key UNIQUE (db_schema);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sistemas_mensuales_schema
ON public.sistemas_mensuales(db_schema);

CREATE INDEX IF NOT EXISTS idx_sistema_pagos_sistema
ON public.sistema_pagos(sistema_id);

INSERT INTO public.sistemas_mensuales
  (nombre_cliente, sistema_slug, db_schema, url_sistema, monto_mensual, fecha_vencimiento, activo)
VALUES
  ('Alejandro Vega', 'alejandro-vega', 'alejandro_vega', '', 0, CURRENT_DATE + INTERVAL '30 days', TRUE)
ON CONFLICT (db_schema) DO NOTHING;
