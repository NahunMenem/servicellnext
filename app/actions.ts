"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearCart, getCart, setCart } from "@/lib/cart";
import { loginWithPassword, logout, requireSession } from "@/lib/auth";
import { getPool, sql } from "@/lib/db";
import { setLastSaleReceipt } from "@/lib/sale-receipt";
import { ensureEgresosRepairLinkSchema, ensureSplitPaymentSchema } from "@/lib/data";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getNumber(formData: FormData, key: string) {
  return Number(getString(formData, key) || 0);
}

function paymentAmount(total: number, amount: number) {
  return Math.round(total * 100) === Math.round(amount * 100);
}

function toCents(amount: number) {
  return Math.round(amount * 100);
}

function buildRedirect(path: string, params?: Record<string, string | undefined>) {
  const queryParams = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) queryParams.set(key, value);
    }
  }
  const query = queryParams.toString();
  return query ? `${path}?${query}` : path;
}

function buildRedirectWithDates(
  path: string,
  fechaDesde?: string,
  fechaHasta?: string,
  extra?: Record<string, string | undefined>
) {
  return buildRedirect(path, {
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
    ...extra
  });
}

function buildSuccessRedirect(path: string, notice: string, extra?: Record<string, string | undefined>) {
  return buildRedirect(path, {
    ...extra,
    notice,
    notice_type: "success"
  });
}

function buildErrorRedirect(path: string, notice: string, extra?: Record<string, string | undefined>) {
  return buildRedirect(path, {
    ...extra,
    notice,
    notice_type: "error"
  });
}

export async function loginAction(formData: FormData) {
  const username = getString(formData, "username");
  const password = getString(formData, "password");

  let session = null;
  try {
    session = await loginWithPassword(username, password);
  } catch (error) {
    const message =
      error instanceof Error
        ? encodeURIComponent(error.message)
        : encodeURIComponent("Error inesperado al iniciar sesion.");
    redirect(`/login?error=${message}`);
  }

  if (!session) {
    redirect("/login?error=Usuario%20o%20contrasena%20incorrectos");
  }

  redirect("/inicio");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}

export async function addProductAction(formData: FormData) {
  await requireSession();
  const productId = Number(formData.get("producto_id"));
  const cantidad = Number(formData.get("cantidad") ?? 1);

  const { rows } = await sql<{ id: number; nombre: string; precio: string; stock: number }>(
    "SELECT id, nombre, precio::text, stock FROM productos WHERE id = $1 LIMIT 1",
    [productId]
  );

  const product = rows[0];
  if (!product || product.stock < cantidad) {
    redirect(buildErrorRedirect("/registrar_venta", "No hay stock suficiente para agregar ese producto."));
  }

  const cart = await getCart();
  cart.push({
    id: product.id,
    nombre: product.nombre,
    precio: Number(product.precio),
    cantidad,
    sourceType: "producto",
    sourceId: product.id
  });
  await setCart(cart);
  redirect(buildSuccessRedirect("/registrar_venta", "Producto agregado al carrito con exito."));
}

export async function addManualItemAction(formData: FormData) {
  await requireSession();
  const nombre = getString(formData, "nombre_manual");
  const precio = getNumber(formData, "precio_manual");
  const cantidad = getNumber(formData, "cantidad_manual");

  const cart = await getCart();
  cart.push({ id: null, nombre, precio, cantidad, sourceType: "manual", sourceId: null });
  await setCart(cart);
  redirect(buildSuccessRedirect("/registrar_venta", "Servicio manual agregado al carrito con exito."));
}

export async function addRepairOrderAction(formData: FormData) {
  await requireSession();
  const equipoId = getNumber(formData, "equipo_id");

  const { rows } = await sql<{
    id: number;
    tipo_reparacion: string;
    marca: string;
    modelo: string;
    nro_orden: string;
    monto: string;
    nombre_cliente: string;
  }>(
    `
      SELECT id, tipo_reparacion, marca, modelo, nro_orden, monto::text, nombre_cliente
      FROM equipos
      WHERE id = $1
      LIMIT 1
    `,
    [equipoId]
  );

  const equipo = rows[0];
  if (!equipo) {
    redirect(buildErrorRedirect("/registrar_venta", "No se encontro la reparacion seleccionada."));
  }

  const cart = await getCart();
  const alreadyInCart = cart.some((item) => item.sourceType === "equipo" && item.sourceId === equipo.id);
  if (alreadyInCart) {
    redirect(buildErrorRedirect("/registrar_venta", "Esa reparacion ya esta cargada en el carrito."));
  }

  cart.push({
    id: null,
    nombre: `${equipo.tipo_reparacion} - ${equipo.marca} ${equipo.modelo} (${equipo.nro_orden})`,
    precio: Number(equipo.monto),
    cantidad: 1,
    sourceType: "equipo",
    sourceId: equipo.id
  });
  await setCart(cart);
  redirect(buildSuccessRedirect("/registrar_venta", "Reparacion cargada al carrito con exito."));
}

export async function clearCartAction() {
  await requireSession();
  await clearCart();
  redirect(buildSuccessRedirect("/registrar_venta", "Carrito vaciado con exito."));
}

export async function registerSaleAction(formData: FormData) {
  await requireSession();
  await ensureSplitPaymentSchema();
  const cart = await getCart();
  if (!cart.length) {
    redirect(buildErrorRedirect("/registrar_venta", "El carrito esta vacio."));
  }

  const tipoPago1 = getString(formData, "tipo_pago_1");
  const montoPago1 = getNumber(formData, "monto_pago_1");
  const tipoPago2 = getString(formData, "tipo_pago_2");
  const montoPago2 = getNumber(formData, "monto_pago_2");
  const dniCliente = getString(formData, "dni_cliente");
  const total = cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const receiptPayload = {
    fecha: new Date().toISOString(),
    dniCliente,
    total,
    items: cart.map((item) => ({
      nombre: item.nombre,
      cantidad: item.cantidad,
      precio: item.precio,
      total: item.precio * item.cantidad
    })),
    pagos: [
      ...(montoPago1 > 0 && tipoPago1 ? [{ tipo: tipoPago1, monto: montoPago1 }] : []),
      ...(montoPago2 > 0 && tipoPago2 ? [{ tipo: tipoPago2, monto: montoPago2 }] : [])
    ]
  };
  let remainingPago1 = toCents(montoPago1);
  let remainingPago2 = toCents(montoPago2);

  if (!paymentAmount(total, montoPago1 + montoPago2)) {
    redirect(buildErrorRedirect("/registrar_venta", "La suma de los pagos no coincide con el total del carrito."));
  }

  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    for (const item of cart) {
      const itemTotalCents = toCents(item.precio * item.cantidad);
      const pago1Asignado = Math.min(remainingPago1, itemTotalCents);
      const pago2Asignado = Math.min(remainingPago2, itemTotalCents - pago1Asignado);
      remainingPago1 -= pago1Asignado;
      remainingPago2 -= pago2Asignado;
      const paymentLabel = pago1Asignado > 0 && pago2Asignado > 0 ? "mixto" : tipoPago2 && pago2Asignado > 0 ? tipoPago2 : tipoPago1;

      if (item.id !== null) {
        const producto = await client.query<{ stock: number; precio_costo: string }>(
          "SELECT stock, precio_costo::text FROM productos WHERE id = $1 LIMIT 1",
          [item.id]
        );

        const dbProduct = producto.rows[0];
        if (!dbProduct || dbProduct.stock < item.cantidad) {
          throw new Error(`No hay stock para ${item.nombre}`);
        }

        const venta = await client.query<{ id: number }>(
          `
            INSERT INTO ventas (
              producto_id, cantidad, fecha, nombre_manual, precio_manual,
              tipo_pago, dni_cliente, nombre_producto, precio_unitario, costo_unitario
            ) VALUES ($1, $2, NOW(), NULL, NULL, $3, $4, $5, $6, $7)
            RETURNING id
          `,
          [item.id, item.cantidad, paymentLabel, dniCliente || null, item.nombre, item.precio, Number(dbProduct.precio_costo)]
        );

        if (pago1Asignado > 0 && tipoPago1) {
          await client.query(
            "INSERT INTO venta_pagos (venta_id, tipo_pago, monto) VALUES ($1, $2, $3)",
            [venta.rows[0].id, tipoPago1, pago1Asignado / 100]
          );
        }

        if (pago2Asignado > 0 && tipoPago2) {
          await client.query(
            "INSERT INTO venta_pagos (venta_id, tipo_pago, monto) VALUES ($1, $2, $3)",
            [venta.rows[0].id, tipoPago2, pago2Asignado / 100]
          );
        }

        await client.query("UPDATE productos SET stock = stock - $1 WHERE id = $2", [item.cantidad, item.id]);
      } else {
        const reparacion = await client.query<{ id: number }>(
          `
            INSERT INTO reparaciones (nombre_servicio, precio, cantidad, tipo_pago, dni_cliente, fecha)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING id
          `,
          [item.nombre, item.precio, item.cantidad, paymentLabel, dniCliente || null]
        );

        if (pago1Asignado > 0 && tipoPago1) {
          await client.query(
            "INSERT INTO reparacion_pagos (reparacion_id, tipo_pago, monto) VALUES ($1, $2, $3)",
            [reparacion.rows[0].id, tipoPago1, pago1Asignado / 100]
          );
        }

        if (pago2Asignado > 0 && tipoPago2) {
          await client.query(
            "INSERT INTO reparacion_pagos (reparacion_id, tipo_pago, monto) VALUES ($1, $2, $3)",
            [reparacion.rows[0].id, tipoPago2, pago2Asignado / 100]
          );
        }

        if (item.sourceType === "equipo" && item.sourceId) {
          await client.query("UPDATE equipos SET estado = 'Retirado' WHERE id = $1", [item.sourceId]);
        }
      }
    }

    if (remainingPago1 !== 0 || remainingPago2 !== 0) {
      throw new Error("Quedaron montos sin asignar.");
    }

    await client.query("COMMIT");
    await setLastSaleReceipt(receiptPayload);
    await clearCart();
  } catch {
    await client.query("ROLLBACK");
    redirect(buildErrorRedirect("/registrar_venta", "No se pudo registrar la venta."));
  } finally {
    client.release();
  }

  revalidatePath("/registrar_venta");
  revalidatePath("/dashboard");
  revalidatePath("/caja");
  revalidatePath("/ultimas_ventas");
  revalidatePath("/reparaciones");
  redirect(buildSuccessRedirect("/registrar_venta", "Venta registrada con exito."));
}

export async function createProductAction(formData: FormData) {
  await requireSession();
  await sql(
    `
      INSERT INTO productos (nombre, codigo_barras, stock, precio, precio_costo)
      VALUES (UPPER($1), $2, $3, $4, $5)
    `,
    [
      getString(formData, "nombre"),
      getString(formData, "codigo_barras"),
      getNumber(formData, "stock"),
      getNumber(formData, "precio"),
      getNumber(formData, "precio_costo")
    ]
  );
  revalidatePath("/agregar_stock");
  redirect(buildSuccessRedirect("/agregar_stock", "Producto cargado con exito."));
}

export async function updateProductAction(formData: FormData) {
  const session = await requireSession();
  const productoId = getNumber(formData, "producto_id");
  let stock = getNumber(formData, "stock");

  if (session.role !== "admin") {
    const currentProduct = await sql<{ stock: number }>(
      "SELECT stock FROM productos WHERE id = $1 LIMIT 1",
      [productoId]
    );
    stock = currentProduct.rows[0]?.stock ?? 0;
  }

  await sql(
    `
      UPDATE productos
      SET nombre = UPPER($1), codigo_barras = $2, stock = $3, precio = $4, precio_costo = $5
      WHERE id = $6
    `,
    [
      getString(formData, "nombre"),
      getString(formData, "codigo_barras"),
      stock,
      getNumber(formData, "precio"),
      getNumber(formData, "precio_costo"),
      productoId
    ]
  );
  revalidatePath("/agregar_stock");
  redirect(buildSuccessRedirect("/agregar_stock", "Producto actualizado con exito."));
}

export async function addStockAction(formData: FormData) {
  await requireSession();
  await sql("UPDATE productos SET stock = stock + $1 WHERE id = $2", [
    getNumber(formData, "cantidad"),
    getNumber(formData, "producto_id")
  ]);
  revalidatePath("/agregar_stock");
  redirect(buildSuccessRedirect("/agregar_stock", "Stock actualizado con exito."));
}

export async function deleteProductAction(formData: FormData) {
  await requireSession();
  const productoId = getNumber(formData, "producto_id");
  await sql("DELETE FROM mercaderia_fallada WHERE producto_id = $1", [productoId]);
  const deleted = await sql("DELETE FROM productos WHERE id = $1 RETURNING id", [productoId]);
  revalidatePath("/agregar_stock");
  revalidatePath("/mercaderia_fallada");
  redirect(
    deleted.rowCount
      ? buildSuccessRedirect("/agregar_stock", "Producto eliminado con exito.")
      : buildErrorRedirect("/agregar_stock", "No se encontro el producto para eliminar.")
  );
}

export async function deleteZeroStockProductsAction() {
  await requireSession();
  const deletable = await sql<{ total: string }>(`
    SELECT COUNT(*)::text AS total
    FROM productos
    WHERE stock = 0
  `);
  await sql(`
    DELETE FROM mercaderia_fallada
    WHERE producto_id IN (SELECT id FROM productos WHERE stock = 0)
  `);
  await sql(`
    DELETE FROM productos
    WHERE stock = 0
  `);
  revalidatePath("/agregar_stock");
  revalidatePath("/mercaderia_fallada");
  redirect(
    buildSuccessRedirect(
      "/agregar_stock",
      Number(deletable.rows[0]?.total ?? 0)
        ? `Se eliminaron ${Number(deletable.rows[0]?.total ?? 0)} productos con stock 0.`
        : "No habia productos con stock 0 para eliminar."
    )
  );
}

export async function createEgresoAction(formData: FormData) {
  await requireSession();
  await ensureEgresosRepairLinkSchema();
  const equipoId = getNumber(formData, "equipo_id");
  const fechaDesde = getString(formData, "fecha_desde");
  const fechaHasta = getString(formData, "fecha_hasta");
  await sql(
    `
      INSERT INTO egresos (fecha, monto, descripcion, tipo_pago, tipo_egreso, equipo_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      getString(formData, "fecha"),
      getNumber(formData, "monto"),
      getString(formData, "descripcion"),
      getString(formData, "tipo_pago"),
      getString(formData, "tipo_egreso") || "general",
      equipoId || null
    ]
  );
  revalidatePath("/egresos");
  revalidatePath("/dashboard");
  revalidatePath("/caja");
  revalidatePath("/reparaciones");
  redirect(buildRedirectWithDates("/egresos", fechaDesde, fechaHasta, {
    notice: "Egreso cargado con exito.",
    notice_type: "success"
  }));
}

export async function deleteEgresoAction(formData: FormData) {
  await requireSession();
  const fechaDesde = getString(formData, "fecha_desde");
  const fechaHasta = getString(formData, "fecha_hasta");
  await sql("DELETE FROM egresos WHERE id = $1", [getNumber(formData, "egreso_id")]);
  revalidatePath("/egresos");
  revalidatePath("/dashboard");
  revalidatePath("/caja");
  revalidatePath("/reparaciones");
  redirect(buildRedirectWithDates("/egresos", fechaDesde, fechaHasta, {
    notice: "Egreso eliminado con exito.",
    notice_type: "success"
  }));
}

export async function updateEgresoLinkAction(formData: FormData) {
  await requireSession();
  await ensureEgresosRepairLinkSchema();
  const fechaDesde = getString(formData, "fecha_desde");
  const fechaHasta = getString(formData, "fecha_hasta");
  const egresoId = getNumber(formData, "egreso_id");
  const equipoId = getNumber(formData, "equipo_id");

  await sql("UPDATE egresos SET equipo_id = $1 WHERE id = $2", [equipoId || null, egresoId]);

  revalidatePath("/egresos");
  revalidatePath("/reparaciones");
  revalidatePath("/dashboard");
  revalidatePath("/caja");
  redirect(buildRedirectWithDates("/egresos", fechaDesde, fechaHasta, {
    notice: "Vinculo del egreso actualizado con exito.",
    notice_type: "success"
  }));
}

export async function saveCajaSemanaAction(formData: FormData) {
  await requireSession();
  const semanaInicio = getString(formData, "semana_inicio");
  const efectivoInicial = getNumber(formData, "efectivo_inicial");
  const fechaDesde = getString(formData, "fecha_desde");
  const fechaHasta = getString(formData, "fecha_hasta");

  await sql(`
    CREATE TABLE IF NOT EXISTS caja_semanal (
      semana_inicio DATE PRIMARY KEY,
      efectivo_inicial NUMERIC(12, 2) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await sql(
    `
      INSERT INTO caja_semanal (semana_inicio, efectivo_inicial, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (semana_inicio)
      DO UPDATE SET efectivo_inicial = EXCLUDED.efectivo_inicial, updated_at = NOW()
    `,
    [semanaInicio, efectivoInicial]
  );

  revalidatePath("/caja");
  redirect(buildRedirectWithDates("/caja", fechaDesde, fechaHasta, {
    notice: "Caja semanal guardada con exito.",
    notice_type: "success"
  }));
}

export async function createEquipoAction(formData: FormData) {
  await requireSession();
  const now = new Date();
  const prefix = String(now.getFullYear()).slice(-2) + String(now.getMonth() + 1).padStart(2, "0");
  const ultimo = await sql<{ nro_orden: string }>(
    `
      SELECT nro_orden
      FROM equipos
      WHERE nro_orden LIKE $1
      ORDER BY id DESC
      LIMIT 1
    `,
    [`${prefix}-%`]
  );

  const ultimoNumero = ultimo.rows[0] ? Number(ultimo.rows[0].nro_orden.split("-").at(-1)) : 0;
  const nroOrden = `${prefix}-${ultimoNumero + 1}`;

  await sql(
    `
      INSERT INTO equipos (
        tipo_reparacion, marca, modelo, tecnico, monto,
        nombre_cliente, telefono, nro_orden, fecha, hora, estado, observaciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, CURRENT_TIME, 'Por Reparar', $9)
    `,
    [
      getString(formData, "tipo_reparacion"),
      getString(formData, "equipo"),
      getString(formData, "modelo"),
      getString(formData, "tecnico"),
      getNumber(formData, "monto"),
      getString(formData, "nombre_cliente"),
      getString(formData, "telefono"),
      nroOrden,
      getString(formData, "observaciones")
    ]
  );
  revalidatePath("/reparaciones");
  redirect(buildSuccessRedirect("/reparaciones", "Reparacion cargada con exito."));
}

export async function updateEquipoAction(formData: FormData) {
  await requireSession();
  await sql(
    `
      UPDATE equipos
      SET
        tipo_reparacion = $1,
        marca = $2,
        modelo = $3,
        tecnico = $4,
        monto = $5,
        nombre_cliente = $6,
        telefono = $7,
        observaciones = $8,
        estado = $9
      WHERE id = $10
    `,
    [
      getString(formData, "tipo_reparacion"),
      getString(formData, "marca"),
      getString(formData, "modelo"),
      getString(formData, "tecnico"),
      getNumber(formData, "monto"),
      getString(formData, "nombre_cliente"),
      getString(formData, "telefono"),
      getString(formData, "observaciones"),
      getString(formData, "estado"),
      getNumber(formData, "id")
    ]
  );
  revalidatePath("/reparaciones");
  redirect(buildSuccessRedirect("/reparaciones", "Reparacion actualizada con exito."));
}

export async function deleteEquipoAction(formData: FormData) {
  await requireSession();
  await sql("DELETE FROM equipos WHERE id = $1", [getNumber(formData, "id")]);
  revalidatePath("/reparaciones");
  redirect(buildSuccessRedirect("/reparaciones", "Reparacion eliminada con exito."));
}

export async function updateEquipoStatusAction(formData: FormData) {
  await requireSession();
  await sql("UPDATE equipos SET estado = $1 WHERE nro_orden = $2", [
    getString(formData, "estado"),
    getString(formData, "nro_orden")
  ]);
  revalidatePath("/reparaciones");
  redirect(buildSuccessRedirect("/reparaciones", "Estado de la reparacion actualizado con exito."));
}

export async function updateEquipoStatusWithReturnAction(formData: FormData) {
  await requireSession();
  const fechaDesde = getString(formData, "fecha_desde");
  const fechaHasta = getString(formData, "fecha_hasta");

  await sql("UPDATE equipos SET estado = $1 WHERE nro_orden = $2", [
    getString(formData, "estado"),
    getString(formData, "nro_orden")
  ]);

  revalidatePath("/reparaciones");
  redirect(buildRedirectWithDates("/reparaciones", fechaDesde, fechaHasta, {
    notice: "Estado de la reparacion actualizado con exito.",
    notice_type: "success"
  }));
}

export async function createMercaderiaFalladaAction(formData: FormData) {
  await requireSession();
  const productoId = getNumber(formData, "producto_id");
  const cantidad = getNumber(formData, "cantidad");

  const producto = await sql<{ stock: number }>(
    "SELECT stock FROM productos WHERE id = $1 LIMIT 1",
    [productoId]
  );

  if ((producto.rows[0]?.stock ?? 0) < cantidad) {
    redirect(buildErrorRedirect("/mercaderia_fallada", "No hay stock suficiente para registrar mercaderia fallada."));
  }

  await sql(
    `
      INSERT INTO mercaderia_fallada (producto_id, cantidad, fecha, descripcion)
      VALUES ($1, $2, NOW(), $3)
    `,
    [productoId, cantidad, getString(formData, "descripcion")]
  );

  await sql("UPDATE productos SET stock = stock - $1 WHERE id = $2", [cantidad, productoId]);
  revalidatePath("/mercaderia_fallada");
  revalidatePath("/agregar_stock");
  redirect(buildSuccessRedirect("/mercaderia_fallada", "Mercaderia fallada cargada con exito."));
}

export async function cancelSaleAction(formData: FormData) {
  await requireSession();
  const saleId = getNumber(formData, "venta_id");
  const venta = await sql<{ producto_id: number | null; cantidad: number }>(
    "SELECT producto_id, cantidad FROM ventas WHERE id = $1 LIMIT 1",
    [saleId]
  );

  const row = venta.rows[0];
  if (!row) {
    redirect(buildErrorRedirect("/ultimas_ventas", "No se encontro la venta para anular."));
  }

  if (row.producto_id) {
    await sql("UPDATE productos SET stock = stock + $1 WHERE id = $2", [row.cantidad, row.producto_id]);
  }

  await sql("DELETE FROM ventas WHERE id = $1", [saleId]);
  revalidatePath("/ultimas_ventas");
  revalidatePath("/dashboard");
  revalidatePath("/caja");
  redirect(buildSuccessRedirect("/ultimas_ventas", "Venta anulada con exito."));
}

export async function cancelRepairSaleAction(formData: FormData) {
  await requireSession();
  await sql("DELETE FROM reparaciones WHERE id = $1", [getNumber(formData, "reparacion_id")]);
  revalidatePath("/ultimas_ventas");
  revalidatePath("/dashboard");
  revalidatePath("/caja");
  redirect(buildSuccessRedirect("/ultimas_ventas", "Reparacion anulada con exito."));
}

export async function facturarAction(formData: FormData) {
  await requireSession();
  const facturador = process.env.FACTURADOR_URL;
  if (!facturador) {
    redirect(buildErrorRedirect("/facturar", "Falta configurar FACTURADOR_URL en el entorno."));
  }

  try {
    await fetch(facturador!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cuit: getString(formData, "cuit"),
        monto: getNumber(formData, "monto"),
        descripcion: getString(formData, "descripcion")
      }),
      cache: "no-store"
    });
  } catch {
    redirect(buildErrorRedirect("/facturar", "No se pudo contactar el bot externo."));
  }

  redirect(buildSuccessRedirect("/facturar", "Solicitud enviada al bot de facturacion."));
}
