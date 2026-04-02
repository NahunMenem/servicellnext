import { RegistrarVentaShell } from "@/components/registrar-venta-shell";
import { getCart } from "@/lib/cart";
import { getProductos, getRepairOrderOptions } from "@/lib/data";
import { getLastSaleReceipt } from "@/lib/sale-receipt";

export default async function RegistrarVentaPage({
  searchParams
}: {
  searchParams: Promise<{ busqueda?: string }>;
}) {
  const params = await searchParams;
  const busqueda = params.busqueda ?? "";
  const [productos, reparaciones, carrito, lastSaleReceipt] = await Promise.all([
    getProductos(busqueda),
    getRepairOrderOptions(),
    getCart(),
    getLastSaleReceipt()
  ]);
  return (
    <RegistrarVentaShell
      carrito={carrito}
      initialProducts={productos.items}
      initialQuery={busqueda}
      lastSaleAvailable={Boolean(lastSaleReceipt)}
      repairOrders={reparaciones}
    />
  );
}
