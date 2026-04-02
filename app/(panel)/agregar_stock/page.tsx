import { StockShell } from "@/components/stock-shell";
import { requireSession } from "@/lib/auth";
import { getProductos } from "@/lib/data";
import { parsePage } from "@/lib/pagination";

export default async function AgregarStockPage({
  searchParams
}: {
  searchParams: Promise<{ busqueda?: string; page?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const busqueda = params.busqueda ?? "";
  const page = parsePage(params.page);
  const productos = await getProductos(busqueda, page);

  return (
    <StockShell
      initialHasNext={productos.hasNext}
      initialPage={page}
      initialProducts={productos.items}
      initialQuery={busqueda}
      role={session.role}
    />
  );
}
