import { SignaturePad } from "@/components/signature-pad";

export default async function FirmarPage({
  searchParams
}: {
  searchParams: Promise<{ nro_orden?: string }>;
}) {
  const params = await searchParams;
  const nroOrden = params.nro_orden ?? "";

  return (
    <main style={{ padding: 28, maxWidth: 900, margin: "0 auto" }}>
      <section className="card stack">
        <div className="page-head">
          <div>
            <h1>Firma digital</h1>
            <p>Orden {nroOrden || "sin numero"}.</p>
          </div>
        </div>
        <SignaturePad nroOrden={nroOrden} />
      </section>
    </main>
  );
}
