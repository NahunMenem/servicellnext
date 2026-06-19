import { sql } from "@/lib/db";

export type SistemaMensual = {
  id: number;
  nombre_cliente: string;
  sistema_slug: string;
  db_schema: string;
  url_sistema: string | null;
  monto_mensual: string;
  fecha_vencimiento: string;
  activo: boolean;
  notas: string | null;
  dias_restantes: number;
  total_pagado: string;
  ultimo_pago: string | null;
};

export type SistemaPago = {
  id: number;
  sistema_id: number;
  mes_pagado: string;
  monto: string;
  fecha_pago: string;
  observacion: string | null;
  nombre_cliente: string;
};

export async function ensureSistemasMensualesSchema() {
  await sql(`
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
    )
  `);

  await sql(`
    CREATE TABLE IF NOT EXISTS public.sistema_pagos (
      id SERIAL PRIMARY KEY,
      sistema_id INTEGER NOT NULL REFERENCES public.sistemas_mensuales(id) ON DELETE CASCADE,
      mes_pagado DATE NOT NULL,
      monto NUMERIC(12, 2) NOT NULL,
      fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
      observacion TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await sql(`
    CREATE INDEX IF NOT EXISTS idx_sistemas_mensuales_schema
    ON public.sistemas_mensuales(db_schema)
  `);

  await sql(`
    CREATE INDEX IF NOT EXISTS idx_sistema_pagos_sistema
    ON public.sistema_pagos(sistema_id)
  `);
}

export async function getSistemasMensuales() {
  await ensureSistemasMensualesSchema();
  const result = await sql<SistemaMensual>(`
    SELECT
      s.id,
      s.nombre_cliente,
      s.sistema_slug,
      s.db_schema,
      s.url_sistema,
      s.monto_mensual::text,
      s.fecha_vencimiento::text,
      s.activo,
      s.notas,
      (s.fecha_vencimiento - CURRENT_DATE)::int AS dias_restantes,
      COALESCE(SUM(p.monto), 0)::text AS total_pagado,
      MAX(p.fecha_pago)::text AS ultimo_pago
    FROM public.sistemas_mensuales s
    LEFT JOIN public.sistema_pagos p ON p.sistema_id = s.id
    GROUP BY s.id
    ORDER BY s.activo DESC, s.fecha_vencimiento ASC, s.nombre_cliente ASC
  `);
  return result.rows;
}

export async function getSistemaPagos(limit = 30) {
  await ensureSistemasMensualesSchema();
  const result = await sql<SistemaPago>(
    `
      SELECT
        p.id,
        p.sistema_id,
        p.mes_pagado::text,
        p.monto::text,
        p.fecha_pago::text,
        p.observacion,
        s.nombre_cliente
      FROM public.sistema_pagos p
      INNER JOIN public.sistemas_mensuales s ON s.id = p.sistema_id
      ORDER BY p.fecha_pago DESC, p.id DESC
      LIMIT $1
    `,
    [limit]
  );
  return result.rows;
}
