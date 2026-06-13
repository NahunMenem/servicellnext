import { NextResponse } from "next/server";
import { getSupplierCatalog } from "@/lib/supplier-catalog";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const catalog = await getSupplierCatalog(url.searchParams);
    return NextResponse.json(catalog);
  } catch (error) {
    console.error("No se pudo cargar la tienda del proveedor", error);
    return NextResponse.json(
      { error: "No se pudo cargar el catalogo del proveedor." },
      { status: 502 }
    );
  }
}
