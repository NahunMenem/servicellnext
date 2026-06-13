import { SupplierStoreShell } from "@/components/supplier-store-shell";
import { getSupplierCatalog } from "@/lib/supplier-catalog";

export const metadata = {
  title: "Tienda Servicell",
  description: "Catalogo Servicell con disponibilidad para entrega local."
};

export default async function TiendaServicellPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const urlParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      urlParams.set(key, value);
    }
  }

  const catalog = await getSupplierCatalog(urlParams);

  return <SupplierStoreShell initialCatalog={catalog} />;
}
