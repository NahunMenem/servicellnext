import { sql } from "@/lib/db";
import { normalizeText, startOfWeekInput } from "@/lib/utils";

const PAGE_SIZE = 10;

function getOffset(page: number) {
  return Math.max(page - 1, 0) * PAGE_SIZE;
}

function paginateRows<T>(rows: T[]) {
  return {
    items: rows.slice(0, PAGE_SIZE),
    hasNext: rows.length > PAGE_SIZE
  };
}

function normalizePaymentType(value: string | null | undefined) {
  const normalized = normalizeText(String(value ?? ""));
  if (normalized.includes("efect")) return "efectivo";
  if (normalized.includes("transfer")) return "transferencia";
  if (normalized.includes("tarjet")) return "tarjeta";
  if (normalized.includes("mercado") || normalized.includes("mp")) return "mercado pago";
  return normalized || "sin definir";
}

function mergeTotalsByPayment(
  target: Record<string, number>,
  rows: Array<{ tipo_pago: string; total: string }>
) {
  for (const row of rows) {
    const key = normalizePaymentType(row.tipo_pago);
    target[key] = (target[key] ?? 0) + Number(row.total);
  }
}

async function ensureCajaSemanaTable() {
  await sql(`
    CREATE TABLE IF NOT EXISTS caja_semanal (
      semana_inicio DATE PRIMARY KEY,
      efectivo_inicial NUMERIC(12, 2) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

export async function ensureEgresosRepairLinkSchema() {
  await sql(`
    ALTER TABLE egresos
    ADD COLUMN IF NOT EXISTS tipo_egreso TEXT NOT NULL DEFAULT 'general'
  `);
  await sql(`
    ALTER TABLE egresos
    ADD COLUMN IF NOT EXISTS equipo_id INTEGER NULL REFERENCES equipos(id) ON DELETE SET NULL
  `);
}

export async function ensureSplitPaymentSchema() {
  await sql(`
    CREATE TABLE IF NOT EXISTS venta_pagos (
      id SERIAL PRIMARY KEY,
      venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
      tipo_pago TEXT NOT NULL,
      monto NUMERIC(12, 2) NOT NULL
    )
  `);
  await sql(`
    CREATE TABLE IF NOT EXISTS reparacion_pagos (
      id SERIAL PRIMARY KEY,
      reparacion_id INTEGER NOT NULL REFERENCES reparaciones(id) ON DELETE CASCADE,
      tipo_pago TEXT NOT NULL,
      monto NUMERIC(12, 2) NOT NULL
    )
  `);
}

export async function getQuickStats() {
  const [productos, equipos, ventas, egresos] = await Promise.all([
    sql<{ total: string }>("SELECT COALESCE(SUM(stock), 0)::text AS total FROM productos"),
    sql<{ total: string }>("SELECT COUNT(*)::text AS total FROM equipos"),
    sql<{ total: string }>("SELECT COALESCE(SUM(cantidad), 0)::text AS total FROM ventas"),
    sql<{ total: string }>("SELECT COALESCE(SUM(monto), 0)::text AS total FROM egresos")
  ]);

  return {
    stock: Number(productos.rows[0]?.total ?? 0),
    ordenes: Number(equipos.rows[0]?.total ?? 0),
    unidadesVendidas: Number(ventas.rows[0]?.total ?? 0),
    egresos: Number(egresos.rows[0]?.total ?? 0)
  };
}

export async function getDashboard(fechaDesde: string, fechaHasta: string) {
  await ensureSplitPaymentSchema();
  const [
    totalVentasProductos,
    totalVentasReparaciones,
    totalEgresos,
    totalCosto,
    costoStock,
    ventaStock,
    cantidadTotalStock,
    ventasMensualesProductos,
    ventasMensualesReparaciones,
    ventasSemanalesProductos,
    ventasSemanalesReparaciones,
    distribucion,
    equiposPeriodo,
    equiposPorEstado,
    montoEquiposPorEstado
  ] = await Promise.all([
    sql<{ total: string }>(
      `
        SELECT COALESCE(SUM(v.cantidad * COALESCE(v.precio_unitario, p.precio)), 0)::text AS total
        FROM ventas v
        LEFT JOIN productos p ON p.id = v.producto_id
        WHERE DATE(v.fecha) BETWEEN $1 AND $2
      `,
      [fechaDesde, fechaHasta]
    ),
    sql<{ total: string }>(
      `
        SELECT COALESCE(SUM(cantidad * precio), 0)::text AS total
        FROM reparaciones
        WHERE DATE(fecha) BETWEEN $1 AND $2
      `,
      [fechaDesde, fechaHasta]
    ),
    sql<{ total: string }>(
      `
        SELECT COALESCE(SUM(monto), 0)::text AS total
        FROM egresos
        WHERE DATE(fecha) BETWEEN $1 AND $2
      `,
      [fechaDesde, fechaHasta]
    ),
    sql<{ total: string }>(
      `
        SELECT COALESCE(SUM(v.cantidad * COALESCE(p.precio_costo, v.costo_unitario)), 0)::text AS total
        FROM ventas v
        LEFT JOIN productos p ON p.id = v.producto_id
        WHERE DATE(v.fecha) BETWEEN $1 AND $2
      `,
      [fechaDesde, fechaHasta]
    ),
    sql<{ total: string }>("SELECT COALESCE(SUM(stock * precio_costo), 0)::text AS total FROM productos"),
    sql<{ total: string }>("SELECT COALESCE(SUM(stock * precio), 0)::text AS total FROM productos"),
    sql<{ total: string }>("SELECT COALESCE(SUM(stock), 0)::text AS total FROM productos"),
    sql<{ mes: string; total: string }>(
      `
        SELECT TO_CHAR(v.fecha, 'YYYY-MM') AS mes, COALESCE(SUM(v.cantidad * COALESCE(v.precio_unitario, p.precio)), 0)::text AS total
        FROM ventas v
        LEFT JOIN productos p ON p.id = v.producto_id
        GROUP BY mes
        ORDER BY mes
      `
    ),
    sql<{ mes: string; total: string }>(
      `
        SELECT TO_CHAR(fecha, 'YYYY-MM') AS mes, COALESCE(SUM(cantidad * precio), 0)::text AS total
        FROM reparaciones
        GROUP BY mes
        ORDER BY mes
      `
    ),
    sql<{ semana: string; total: string }>(
      `
        SELECT TO_CHAR(DATE_TRUNC('week', v.fecha), 'YYYY-MM-DD') AS semana,
          COALESCE(SUM(v.cantidad * COALESCE(v.precio_unitario, p.precio)), 0)::text AS total
        FROM ventas v
        LEFT JOIN productos p ON p.id = v.producto_id
        WHERE EXTRACT(DOW FROM v.fecha) BETWEEN 1 AND 6
        GROUP BY semana
        ORDER BY semana
      `
    ),
    sql<{ semana: string; total: string }>(
      `
        SELECT TO_CHAR(DATE_TRUNC('week', fecha), 'YYYY-MM-DD') AS semana,
          COALESCE(SUM(cantidad * precio), 0)::text AS total
        FROM reparaciones
        WHERE EXTRACT(DOW FROM fecha) BETWEEN 1 AND 6
        GROUP BY semana
        ORDER BY semana
      `
    ),
    sql<{ tipo: string; total: string }>(
      `
        SELECT 'Productos' AS tipo, COALESCE(SUM(v.cantidad * COALESCE(v.precio_unitario, p.precio)), 0)::text AS total
        FROM ventas v
        LEFT JOIN productos p ON p.id = v.producto_id
        WHERE DATE(v.fecha) BETWEEN $1 AND $2
        UNION ALL
        SELECT 'Reparaciones' AS tipo, COALESCE(SUM(cantidad * precio), 0)::text AS total
        FROM reparaciones
        WHERE DATE(fecha) BETWEEN $1 AND $2
      `,
      [fechaDesde, fechaHasta]
    ),
    sql<{
      id: number;
      tipo_reparacion: string;
      marca: string;
      modelo: string;
      monto: string;
      estado: string;
      fecha: string;
    }>(
      `
        SELECT id, tipo_reparacion, marca, modelo, monto::text, estado, fecha::text
        FROM equipos
        WHERE fecha BETWEEN $1 AND $2
        ORDER BY fecha DESC, hora DESC
      `,
      [fechaDesde, fechaHasta]
    ),
    sql<{ estado: string; cantidad: string }>(
      `
        SELECT estado, COUNT(*)::text AS cantidad
        FROM equipos
        WHERE fecha BETWEEN $1 AND $2
        GROUP BY estado
      `,
      [fechaDesde, fechaHasta]
    ),
    sql<{ estado: string; monto: string }>(
      `
        SELECT estado, COALESCE(SUM(monto), 0)::text AS monto
        FROM equipos
        WHERE fecha BETWEEN $1 AND $2
        GROUP BY estado
      `,
      [fechaDesde, fechaHasta]
    )
  ]);

  const totalVentasProductosValue = Number(totalVentasProductos.rows[0]?.total ?? 0);
  const totalVentasReparacionesValue = Number(totalVentasReparaciones.rows[0]?.total ?? 0);
  const totalEgresosValue = Number(totalEgresos.rows[0]?.total ?? 0);
  const totalCostoValue = Number(totalCosto.rows[0]?.total ?? 0);
  const gananciaValue =
    totalVentasProductosValue + totalVentasReparacionesValue - totalEgresosValue - totalCostoValue;

  const monthlyMap = new Map<string, number>();
  for (const row of ventasMensualesProductos.rows) {
    monthlyMap.set(row.mes, Number(row.total));
  }
  for (const row of ventasMensualesReparaciones.rows) {
    monthlyMap.set(row.mes, (monthlyMap.get(row.mes) ?? 0) + Number(row.total));
  }

  const weeklyMap = new Map<string, number>();
  for (const row of ventasSemanalesProductos.rows) {
    weeklyMap.set(row.semana, Number(row.total));
  }
  for (const row of ventasSemanalesReparaciones.rows) {
    weeklyMap.set(row.semana, (weeklyMap.get(row.semana) ?? 0) + Number(row.total));
  }

  const telefonosPorEstado = {
    por_reparar: { cantidad: 0, monto: 0 },
    en_reparacion: { cantidad: 0, monto: 0 },
    listo: { cantidad: 0, monto: 0 },
    retirado: { cantidad: 0, monto: 0 },
    no_salio: { cantidad: 0, monto: 0 }
  };

  const montoMap = new Map(
    montoEquiposPorEstado.rows.map((row) => [normalizeText(row.estado), Number(row.monto)])
  );

  for (const row of equiposPorEstado.rows) {
    const estado = normalizeText(row.estado);
    const cantidad = Number(row.cantidad);
    const monto = montoMap.get(estado) ?? 0;

    if (estado.includes("por reparar")) telefonosPorEstado.por_reparar = { cantidad, monto };
    else if (estado.includes("en reparacion")) telefonosPorEstado.en_reparacion = { cantidad, monto };
    else if (estado.includes("listo")) telefonosPorEstado.listo = { cantidad, monto };
    else if (estado.includes("retirado")) telefonosPorEstado.retirado = { cantidad, monto };
    else if (estado.includes("no salio")) telefonosPorEstado.no_salio = { cantidad, monto };
  }

  return {
    totalVentas: totalVentasProductosValue + totalVentasReparacionesValue,
    totalVentasProductos: totalVentasProductosValue,
    totalVentasReparaciones: totalVentasReparacionesValue,
    totalEgresos: totalEgresosValue,
    totalCosto: totalCostoValue,
    ganancia: gananciaValue,
    totalGananciaMasCosto: gananciaValue + totalCostoValue,
    totalCostoStock: Number(costoStock.rows[0]?.total ?? 0),
    totalVentaStock: Number(ventaStock.rows[0]?.total ?? 0),
    cantidadTotalStock: Number(cantidadTotalStock.rows[0]?.total ?? 0),
    telefonosPeriodo: {
      total: equiposPeriodo.rows.length,
      montoTotal: equiposPeriodo.rows.reduce((sum, item) => sum + Number(item.monto), 0),
      estados: telefonosPorEstado,
      items: equiposPeriodo.rows.map((item) => ({
        ...item,
        monto: Number(item.monto)
      }))
    },
    ventasMensuales: Array.from(monthlyMap.entries()).map(([mes, total]) => ({ mes, total })),
    ventasSemanales: Array.from(weeklyMap.entries()).map(([semana, total]) => ({ semana, total })),
    distribucionVentas: distribucion.rows.map((row) => ({
      tipo: row.tipo,
      total: Number(row.total)
    }))
  };
}

export async function getProductos(busqueda?: string, page = 1) {
  const offset = getOffset(page);
  if (busqueda) {
    const { rows } = await sql<{
      id: number;
      nombre: string;
      codigo_barras: string;
      stock: number;
      precio: string;
      precio_costo: string;
    }>(
      `
        SELECT id, nombre, codigo_barras, stock, precio::text, precio_costo::text
        FROM productos
        WHERE nombre ILIKE $1 OR codigo_barras ILIKE $1
        ORDER BY nombre ASC
        LIMIT $2 OFFSET $3
      `,
      [`%${busqueda}%`, PAGE_SIZE + 1, offset]
    );
    return paginateRows(rows);
  }

  const { rows } = await sql<{
    id: number;
    nombre: string;
    codigo_barras: string;
    stock: number;
    precio: string;
    precio_costo: string;
  }>(
    `
      SELECT id, nombre, codigo_barras, stock, precio::text, precio_costo::text
      FROM productos
      ORDER BY nombre ASC
      LIMIT $1 OFFSET $2
    `
    ,
    [PAGE_SIZE + 1, offset]
  );
  return paginateRows(rows);
}

export async function getLowStockProducts(page = 1) {
  const offset = getOffset(page);
  const { rows } = await sql<{
    id: number;
    nombre: string;
    codigo_barras: string;
    stock: number;
    precio: string;
    precio_costo: string;
  }>(
    `
      SELECT id, nombre, codigo_barras, stock, precio::text, precio_costo::text
      FROM productos
      WHERE stock <= 2
      ORDER BY stock ASC, nombre ASC
      LIMIT $1 OFFSET $2
    `,
    [PAGE_SIZE + 1, offset]
  );
  return paginateRows(rows);
}

export async function getTopProducts(page = 1) {
  const offset = getOffset(page);
  const [top, total] = await Promise.all([
    sql<{ nombre: string; precio: string; cantidad_vendida: string }>(
      `
        SELECT
          COALESCE(v.nombre_producto, p.nombre) AS nombre,
          COALESCE(v.precio_unitario, p.precio)::text AS precio,
          SUM(v.cantidad)::text AS cantidad_vendida
        FROM ventas v
        LEFT JOIN productos p ON p.id = v.producto_id
        GROUP BY COALESCE(v.nombre_producto, p.nombre), COALESCE(v.precio_unitario, p.precio)
        ORDER BY SUM(v.cantidad) DESC
        LIMIT $1 OFFSET $2
      `,
      [PAGE_SIZE + 1, offset]
    ),
    sql<{ total: string }>("SELECT COALESCE(SUM(cantidad), 0)::text AS total FROM ventas")
  ]);

  const totalVentas = Number(total.rows[0]?.total ?? 0);
  return {
    totalVentas,
    ...paginateRows(
      top.rows.map((row) => ({
        nombre: row.nombre,
        precio: Number(row.precio),
        cantidadVendida: Number(row.cantidad_vendida),
        porcentaje: totalVentas ? (Number(row.cantidad_vendida) / totalVentas) * 100 : 0
      }))
    )
  };
}

export async function getVentasAndReparaciones(
  fechaDesde: string,
  fechaHasta: string,
  page = 1
) {
  await ensureSplitPaymentSchema();
  const offset = getOffset(page);
  const [ventas, reparaciones] = await Promise.all([
    sql<{
      venta_id: number;
      nombre_producto: string;
      cantidad: number;
      precio_unitario: string;
      total: string;
      fecha: Date;
      tipo_pago: string;
      dni_cliente: string | null;
    }>(
      `
        SELECT
          v.id AS venta_id,
          COALESCE(v.nombre_producto, p.nombre) AS nombre_producto,
          v.cantidad,
          COALESCE(v.precio_unitario, p.precio)::text AS precio_unitario,
          (v.cantidad * COALESCE(v.precio_unitario, p.precio))::text AS total,
          v.fecha,
          COALESCE(
            (
              SELECT CASE
                WHEN COUNT(*) > 1 THEN 'mixto'
                ELSE MAX(vp.tipo_pago)
              END
              FROM venta_pagos vp
              WHERE vp.venta_id = v.id
            ),
            v.tipo_pago
          ) AS tipo_pago,
          v.dni_cliente
        FROM ventas v
        LEFT JOIN productos p ON p.id = v.producto_id
        WHERE DATE(v.fecha) BETWEEN $1 AND $2
        ORDER BY v.fecha DESC
        LIMIT $3 OFFSET $4
      `,
      [fechaDesde, fechaHasta, PAGE_SIZE + 1, offset]
    ),
    sql<{
      reparacion_id: number;
      nombre_servicio: string;
      cantidad: number;
      precio_unitario: string;
      total: string;
      fecha: Date;
      tipo_pago: string;
    }>(
      `
        SELECT
          id AS reparacion_id,
          nombre_servicio,
          cantidad,
          precio::text AS precio_unitario,
          (cantidad * precio)::text AS total,
          fecha,
          COALESCE(
            (
              SELECT CASE
                WHEN COUNT(*) > 1 THEN 'mixto'
                ELSE MAX(rp.tipo_pago)
              END
              FROM reparacion_pagos rp
              WHERE rp.reparacion_id = r.id
            ),
            tipo_pago
          ) AS tipo_pago
        FROM reparaciones r
        WHERE DATE(fecha) BETWEEN $1 AND $2
        ORDER BY fecha DESC
        LIMIT $3 OFFSET $4
      `,
      [fechaDesde, fechaHasta, PAGE_SIZE + 1, offset]
    )
  ]);

  const paginatedVentas = paginateRows(ventas.rows);
  const paginatedReparaciones = paginateRows(reparaciones.rows);

  const totalVentasPorPago: Record<string, number> = {};
  const totalReparacionesPorPago: Record<string, number> = {};
  const [ventasPorPago, reparacionesPorPago] = await Promise.all([
    sql<{ tipo_pago: string; total: string }>(
      `
        SELECT tipo_pago, COALESCE(SUM(total), 0)::text AS total
        FROM (
          SELECT vp.tipo_pago, vp.monto AS total
          FROM venta_pagos vp
          JOIN ventas v ON v.id = vp.venta_id
          WHERE DATE(v.fecha) BETWEEN $1 AND $2
          UNION ALL
          SELECT v.tipo_pago, (v.cantidad * COALESCE(v.precio_unitario, p.precio)) AS total
          FROM ventas v
          LEFT JOIN productos p ON p.id = v.producto_id
          WHERE DATE(v.fecha) BETWEEN $1 AND $2
            AND NOT EXISTS (SELECT 1 FROM venta_pagos vp WHERE vp.venta_id = v.id)
        ) pagos
        GROUP BY tipo_pago
      `,
      [fechaDesde, fechaHasta]
    ),
    sql<{ tipo_pago: string; total: string }>(
      `
        SELECT tipo_pago, COALESCE(SUM(total), 0)::text AS total
        FROM (
          SELECT rp.tipo_pago, rp.monto AS total
          FROM reparacion_pagos rp
          JOIN reparaciones r ON r.id = rp.reparacion_id
          WHERE DATE(r.fecha) BETWEEN $1 AND $2
          UNION ALL
          SELECT r.tipo_pago, (r.cantidad * r.precio) AS total
          FROM reparaciones r
          WHERE DATE(r.fecha) BETWEEN $1 AND $2
            AND NOT EXISTS (SELECT 1 FROM reparacion_pagos rp WHERE rp.reparacion_id = r.id)
        ) pagos
        GROUP BY tipo_pago
      `,
      [fechaDesde, fechaHasta]
    )
  ]);
  mergeTotalsByPayment(totalVentasPorPago, ventasPorPago.rows);
  mergeTotalsByPayment(totalReparacionesPorPago, reparacionesPorPago.rows);

  return {
    ventas: paginatedVentas.items,
    reparaciones: paginatedReparaciones.items,
    hasNextVentas: paginatedVentas.hasNext,
    hasNextReparaciones: paginatedReparaciones.hasNext,
    totalVentasPorPago,
    totalReparacionesPorPago
  };
}

export async function getEgresos(fechaDesde = "", fechaHasta = "", page = 1) {
  await ensureEgresosRepairLinkSchema();
  const offset = getOffset(page);
  const { rows } = await sql<{
    id: number;
    fecha: string;
    monto: string;
    descripcion: string;
    tipo_pago: string;
    tipo_egreso: string;
    equipo_id: number | null;
    nro_orden: string | null;
    nombre_cliente: string | null;
  }>(
    `
      SELECT
        e.id,
        e.fecha::text,
        e.monto::text,
        e.descripcion,
        e.tipo_pago,
        e.tipo_egreso,
        e.equipo_id,
        eq.nro_orden,
        eq.nombre_cliente
      FROM egresos e
      LEFT JOIN equipos eq ON eq.id = e.equipo_id
      WHERE ($1 = '' OR DATE(e.fecha) >= $1::date)
        AND ($2 = '' OR DATE(e.fecha) <= $2::date)
      ORDER BY fecha DESC, id DESC
      LIMIT $3 OFFSET $4
    `,
    [fechaDesde, fechaHasta, PAGE_SIZE + 1, offset]
  );
  return paginateRows(rows);
}

export async function getRepairOrderOptions() {
  const { rows } = await sql<{
    id: number;
    nro_orden: string;
    nombre_cliente: string;
    marca: string;
    modelo: string;
    tipo_reparacion: string;
    estado: string;
    fecha: string;
    monto: string;
  }>(
    `
      SELECT id, nro_orden, nombre_cliente, marca, modelo, tipo_reparacion, estado, fecha::text, monto::text
      FROM equipos
      WHERE COALESCE(estado, '') NOT ILIKE 'retirado'
      ORDER BY fecha DESC, hora DESC
      LIMIT 100
    `
  );

  return rows;
}

export async function getCaja(fechaDesde: string, fechaHasta: string, page = 1) {
  const offset = getOffset(page);
  await ensureCajaSemanaTable();
  await ensureSplitPaymentSchema();
  const semanaInicio = startOfWeekInput(fechaDesde);
  const [
    ventasInfo,
    egresos,
    ventasPorPago,
    reparacionesPorPago,
    egresosPorPago,
    ventasEfectivoSemana,
    reparacionesEfectivoSemana,
    egresosEfectivoSemana,
    aperturaSemana
  ] =
    await Promise.all([
      getVentasAndReparaciones(fechaDesde, fechaHasta, page),
      sql<{ id: number; descripcion: string; monto: string; tipo_pago: string; fecha: string }>(
        `
          SELECT id, descripcion, monto::text, tipo_pago, fecha::text
          FROM egresos
          WHERE DATE(fecha) BETWEEN $1 AND $2
          ORDER BY fecha DESC, id DESC
          LIMIT $3 OFFSET $4
        `,
        [fechaDesde, fechaHasta, PAGE_SIZE + 1, offset]
      ),
      sql<{ tipo_pago: string; total: string }>(
        `
          SELECT tipo_pago, COALESCE(SUM(total), 0)::text AS total
          FROM (
            SELECT vp.tipo_pago, vp.monto AS total
            FROM venta_pagos vp
            JOIN ventas v ON v.id = vp.venta_id
            WHERE DATE(v.fecha) BETWEEN $1 AND $2
            UNION ALL
            SELECT v.tipo_pago, (v.cantidad * COALESCE(v.precio_unitario, p.precio)) AS total
            FROM ventas v
            LEFT JOIN productos p ON p.id = v.producto_id
            WHERE DATE(v.fecha) BETWEEN $1 AND $2
              AND NOT EXISTS (SELECT 1 FROM venta_pagos vp WHERE vp.venta_id = v.id)
          ) pagos
          GROUP BY tipo_pago
        `,
        [fechaDesde, fechaHasta]
      ),
      sql<{ tipo_pago: string; total: string }>(
        `
          SELECT tipo_pago, COALESCE(SUM(total), 0)::text AS total
          FROM (
            SELECT rp.tipo_pago, rp.monto AS total
            FROM reparacion_pagos rp
            JOIN reparaciones r ON r.id = rp.reparacion_id
            WHERE DATE(r.fecha) BETWEEN $1 AND $2
            UNION ALL
            SELECT r.tipo_pago, (r.cantidad * r.precio) AS total
            FROM reparaciones r
            WHERE DATE(r.fecha) BETWEEN $1 AND $2
              AND NOT EXISTS (SELECT 1 FROM reparacion_pagos rp WHERE rp.reparacion_id = r.id)
          ) pagos
          GROUP BY tipo_pago
        `,
        [fechaDesde, fechaHasta]
      ),
      sql<{ tipo_pago: string; total: string }>(
        `
          SELECT tipo_pago, COALESCE(SUM(monto), 0)::text AS total
          FROM egresos
          WHERE DATE(fecha) BETWEEN $1 AND $2
          GROUP BY tipo_pago
        `,
        [fechaDesde, fechaHasta]
      ),
      sql<{ tipo_pago: string; total: string }>(
        `
          SELECT tipo_pago, COALESCE(SUM(total), 0)::text AS total
          FROM (
            SELECT vp.tipo_pago, vp.monto AS total
            FROM venta_pagos vp
            JOIN ventas v ON v.id = vp.venta_id
            WHERE DATE(v.fecha) BETWEEN $1 AND $2
            UNION ALL
            SELECT v.tipo_pago, (v.cantidad * COALESCE(v.precio_unitario, p.precio)) AS total
            FROM ventas v
            LEFT JOIN productos p ON p.id = v.producto_id
            WHERE DATE(v.fecha) BETWEEN $1 AND $2
              AND NOT EXISTS (SELECT 1 FROM venta_pagos vp WHERE vp.venta_id = v.id)
          ) pagos
          GROUP BY tipo_pago
        `,
        [semanaInicio, fechaHasta]
      ),
      sql<{ tipo_pago: string; total: string }>(
        `
          SELECT tipo_pago, COALESCE(SUM(total), 0)::text AS total
          FROM (
            SELECT rp.tipo_pago, rp.monto AS total
            FROM reparacion_pagos rp
            JOIN reparaciones r ON r.id = rp.reparacion_id
            WHERE DATE(r.fecha) BETWEEN $1 AND $2
            UNION ALL
            SELECT r.tipo_pago, (r.cantidad * r.precio) AS total
            FROM reparaciones r
            WHERE DATE(r.fecha) BETWEEN $1 AND $2
              AND NOT EXISTS (SELECT 1 FROM reparacion_pagos rp WHERE rp.reparacion_id = r.id)
          ) pagos
          GROUP BY tipo_pago
        `,
        [semanaInicio, fechaHasta]
      ),
      sql<{ tipo_pago: string; total: string }>(
        `
          SELECT tipo_pago, COALESCE(SUM(monto), 0)::text AS total
          FROM egresos
          WHERE DATE(fecha) BETWEEN $1 AND $2
          GROUP BY tipo_pago
        `,
        [semanaInicio, fechaHasta]
      ),
      sql<{ efectivo_inicial: string }>(
        `
          SELECT efectivo_inicial::text
          FROM caja_semanal
          WHERE semana_inicio = $1
          LIMIT 1
        `,
        [semanaInicio]
      )
    ]);

  const paginatedEgresos = paginateRows(egresos.rows);

  const ingresosPorPago: Record<string, number> = {};
  const totalEgresosPorPago: Record<string, number> = {};
  mergeTotalsByPayment(ingresosPorPago, ventasPorPago.rows);
  mergeTotalsByPayment(ingresosPorPago, reparacionesPorPago.rows);
  mergeTotalsByPayment(totalEgresosPorPago, egresosPorPago.rows);

  const netoPorPago: Record<string, number> = {};
  const tipos = new Set([
    ...Object.keys(ingresosPorPago),
    ...Object.keys(totalEgresosPorPago),
    "efectivo"
  ]);
  for (const tipo of tipos) {
    netoPorPago[tipo] = (ingresosPorPago[tipo] ?? 0) - (totalEgresosPorPago[tipo] ?? 0);
  }
  const totalNeto = Object.values(netoPorPago).reduce((sum, value) => sum + value, 0);

  const efectivoInicial = Number(aperturaSemana.rows[0]?.efectivo_inicial ?? 0);
  const ingresosSemanaPorPago: Record<string, number> = {};
  const egresosSemanaPorPago: Record<string, number> = {};
  mergeTotalsByPayment(ingresosSemanaPorPago, ventasEfectivoSemana.rows);
  mergeTotalsByPayment(ingresosSemanaPorPago, reparacionesEfectivoSemana.rows);
  mergeTotalsByPayment(egresosSemanaPorPago, egresosEfectivoSemana.rows);
  const efectivoEsperado =
    efectivoInicial +
    (ingresosSemanaPorPago.efectivo ?? 0) -
    (egresosSemanaPorPago.efectivo ?? 0);
  const ingresosTotales = Object.values(ingresosPorPago).reduce((sum, value) => sum + value, 0);
  const egresosTotales = Object.values(totalEgresosPorPago).reduce((sum, value) => sum + value, 0);

  return {
    ...ventasInfo,
    egresos: paginatedEgresos.items,
    hasNextEgresos: paginatedEgresos.hasNext,
    semanaInicio,
    efectivoInicial,
    efectivoEsperado,
    ingresosEfectivoSemana: ingresosSemanaPorPago.efectivo ?? 0,
    egresosEfectivoSemana: egresosSemanaPorPago.efectivo ?? 0,
    ingresosTotales,
    egresosTotales,
    totalNeto,
    ingresosPorPago,
    egresosPorPago: totalEgresosPorPago,
    netoPorPago
  };
}

export async function getEquipos(fechaDesde: string, fechaHasta: string, page = 1) {
  await ensureEgresosRepairLinkSchema();
  const offset = getOffset(page);
  const [equipos, porTecnico, porEstado, porTipo, costosVinculados] = await Promise.all([
    sql<{
      id: number;
      tipo_reparacion: string;
      marca: string;
      modelo: string;
      tecnico: string;
      monto: string;
      nombre_cliente: string;
      telefono: string;
      nro_orden: string;
      fecha: string;
      hora: string;
      estado: string;
      observaciones: string | null;
      firma_cliente: string | null;
    }>(
      `
        SELECT
          id,
          tipo_reparacion,
          marca,
          modelo,
          tecnico,
          monto::text,
          nombre_cliente,
          telefono,
          nro_orden,
          fecha::text,
          hora,
          estado,
          observaciones,
          firma_cliente
        FROM equipos
        WHERE fecha BETWEEN $1 AND $2
        ORDER BY fecha DESC, hora DESC
        LIMIT $3 OFFSET $4
      `,
      [fechaDesde, fechaHasta, PAGE_SIZE + 1, offset]
    ),
    sql<{ tecnico: string; cantidad: string }>(
      `
        SELECT tecnico, COUNT(*)::text AS cantidad
        FROM equipos
        WHERE fecha BETWEEN $1 AND $2
        GROUP BY tecnico
      `,
      [fechaDesde, fechaHasta]
    ),
    sql<{ estado: string; cantidad: string }>(
      `
        SELECT estado, COUNT(*)::text AS cantidad
        FROM equipos
        WHERE fecha BETWEEN $1 AND $2
        GROUP BY estado
      `,
      [fechaDesde, fechaHasta]
    ),
    sql<{ tipo_reparacion: string; cantidad: string }>(
      `
        SELECT tipo_reparacion, COUNT(*)::text AS cantidad
        FROM equipos
        WHERE fecha BETWEEN $1 AND $2
        GROUP BY tipo_reparacion
      `,
      [fechaDesde, fechaHasta]
    ),
    sql<{ equipo_id: number; costo_total: string; cantidad: string; detalle: string | null }>(
      `
        SELECT
          e.equipo_id,
          COALESCE(SUM(e.monto), 0)::text AS costo_total,
          COUNT(*)::text AS cantidad,
          STRING_AGG(e.descripcion, ' • ' ORDER BY e.fecha DESC, e.id DESC) AS detalle
        FROM egresos e
        JOIN equipos eq ON eq.id = e.equipo_id
        WHERE eq.fecha BETWEEN $1 AND $2 AND e.equipo_id IS NOT NULL
        GROUP BY e.equipo_id
      `,
      [fechaDesde, fechaHasta]
    )
  ]);

  const paginatedEquipos = paginateRows(equipos.rows);

  const equiposPorTecnico = Object.fromEntries(
    porTecnico.rows.map((row) => [row.tecnico, Number(row.cantidad)])
  );

  const estados = {
    por_reparar: 0,
    en_reparacion: 0,
    listo: 0,
    retirado: 0,
    no_salio: 0
  };

  for (const row of porEstado.rows) {
    const estado = normalizeText(row.estado);
    const cantidad = Number(row.cantidad);

    if (estado.includes("por reparar")) estados.por_reparar += cantidad;
    else if (estado.includes("en reparacion")) estados.en_reparacion += cantidad;
    else if (estado.includes("listo")) estados.listo += cantidad;
    else if (estado.includes("retirado")) estados.retirado += cantidad;
    else if (estado.includes("no salio")) estados.no_salio += cantidad;
  }

  const resumenTipoMap = new Map<string, number>();
  for (const row of porTipo.rows) {
    const key = normalizeText(row.tipo_reparacion).replace(/\b\w/g, (letter) => letter.toUpperCase());
    resumenTipoMap.set(key, (resumenTipoMap.get(key) ?? 0) + Number(row.cantidad));
  }

  const costosPorEquipo = new Map(
    costosVinculados.rows.map((row) => [
      row.equipo_id,
      {
        costoTotal: Number(row.costo_total),
        cantidad: Number(row.cantidad),
        detalle: row.detalle ?? ""
      }
    ])
  );

  return {
    equipos: paginatedEquipos.items.map((equipo) => {
      const costo = costosPorEquipo.get(equipo.id);
      const monto = Number(equipo.monto);
      return {
        ...equipo,
        costo_vinculado: costo?.costoTotal ?? 0,
        cantidad_costos_vinculados: costo?.cantidad ?? 0,
        detalle_costos_vinculados: costo?.detalle ?? "",
        ganancia_aproximada: monto - (costo?.costoTotal ?? 0)
      };
    }),
    hasNextEquipos: paginatedEquipos.hasNext,
    equiposPorTecnico,
    estados: {
      ...estados,
      total: Object.values(estados).reduce((sum, value) => sum + value, 0)
    },
    resumenTipo: Array.from(resumenTipoMap.entries()).map(([tipo, cantidad]) => ({
      tipo_reparacion: tipo,
      cantidad
    }))
  };
}

export async function getEquiposSearch(
  fechaDesde: string,
  fechaHasta: string,
  busqueda = "",
  page = 1
) {
  await ensureEgresosRepairLinkSchema();
  const offset = getOffset(page);
  const search = busqueda.trim();
  const searchTerm = `%${search}%`;

  const [equipos, costosVinculados] = await Promise.all([
    sql<{
      id: number;
      tipo_reparacion: string;
      marca: string;
      modelo: string;
      tecnico: string;
      monto: string;
      nombre_cliente: string;
      telefono: string;
      nro_orden: string;
      fecha: string;
      hora: string;
      estado: string;
      observaciones: string | null;
      firma_cliente: string | null;
    }>(
      `
        SELECT
          id,
          tipo_reparacion,
          marca,
          modelo,
          tecnico,
          monto::text,
          nombre_cliente,
          telefono,
          nro_orden,
          fecha::text,
          hora,
          estado,
          observaciones,
          firma_cliente
        FROM equipos
        WHERE fecha BETWEEN $1 AND $2
          AND (
            $3 = ''
            OR tipo_reparacion ILIKE $4
            OR COALESCE(observaciones, '') ILIKE $4
            OR marca ILIKE $4
            OR modelo ILIKE $4
            OR tecnico ILIKE $4
            OR nombre_cliente ILIKE $4
            OR telefono ILIKE $4
            OR nro_orden ILIKE $4
            OR estado ILIKE $4
          )
        ORDER BY fecha DESC, hora DESC
        LIMIT $5 OFFSET $6
      `,
      [fechaDesde, fechaHasta, search, searchTerm, PAGE_SIZE + 1, offset]
    ),
    sql<{ equipo_id: number; costo_total: string; cantidad: string; detalle: string | null }>(
      `
        SELECT
          e.equipo_id,
          COALESCE(SUM(e.monto), 0)::text AS costo_total,
          COUNT(*)::text AS cantidad,
          STRING_AGG(e.descripcion, ' • ' ORDER BY e.fecha DESC, e.id DESC) AS detalle
        FROM egresos e
        JOIN equipos eq ON eq.id = e.equipo_id
        WHERE eq.fecha BETWEEN $1 AND $2 AND e.equipo_id IS NOT NULL
        GROUP BY e.equipo_id
      `,
      [fechaDesde, fechaHasta]
    )
  ]);

  const paginatedEquipos = paginateRows(equipos.rows);
  const costosPorEquipo = new Map(
    costosVinculados.rows.map((row) => [
      row.equipo_id,
      {
        costoTotal: Number(row.costo_total),
        cantidad: Number(row.cantidad),
        detalle: row.detalle ?? ""
      }
    ])
  );

  return {
    items: paginatedEquipos.items.map((equipo) => {
      const costo = costosPorEquipo.get(equipo.id);
      const monto = Number(equipo.monto);
      return {
        ...equipo,
        costo_vinculado: costo?.costoTotal ?? 0,
        cantidad_costos_vinculados: costo?.cantidad ?? 0,
        detalle_costos_vinculados: costo?.detalle ?? "",
        ganancia_aproximada: monto - (costo?.costoTotal ?? 0)
      };
    }),
    hasNext: paginatedEquipos.hasNext
  };
}

export async function getEquipoByOrden(nroOrden: string) {
  const { rows } = await sql<{
    id: number;
    tipo_reparacion: string;
    marca: string;
    modelo: string;
    tecnico: string;
    monto: string;
    nombre_cliente: string;
    telefono: string;
    nro_orden: string;
    fecha: string;
    hora: string;
    estado: string;
    observaciones: string | null;
    firma_cliente: string | null;
  }>(
    `
      SELECT
        id,
        tipo_reparacion,
        marca,
        modelo,
        tecnico,
        monto::text,
        nombre_cliente,
        telefono,
        nro_orden,
        fecha::text,
        hora,
        estado,
        observaciones,
        firma_cliente
      FROM equipos
      WHERE nro_orden = $1
      LIMIT 1
    `,
    [nroOrden]
  );

  return rows[0] ?? null;
}

export async function getMercaderiaFallada(page = 1) {
  const offset = getOffset(page);
  const { rows } = await sql<{
    id: number;
    nombre: string;
    cantidad: number;
    fecha: Date;
    descripcion: string;
  }>(
    `
      SELECT mf.id, p.nombre, mf.cantidad, mf.fecha, mf.descripcion
      FROM mercaderia_fallada mf
      JOIN productos p ON p.id = mf.producto_id
      ORDER BY mf.fecha DESC
      LIMIT $1 OFFSET $2
    `,
    [PAGE_SIZE + 1, offset]
  );

  return paginateRows(rows);
}
