import { facturarAction } from "@/app/actions";

export default async function FacturarPage({
  searchParams: _searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Facturar</h1>
          <p>
            Conserva el flujo de integracion externa: Next envia los datos al bot o servicio
            que hoy automatiza AFIP.
          </p>
        </div>
      </div>

      <div className="grid cols-2">
        <section className="card stack">
          <strong>Generar solicitud</strong>
          <form action={facturarAction} className="form-grid">
            <div className="field">
              <label>CUIT / DNI</label>
              <input name="cuit" required />
            </div>
            <div className="field">
              <label>Monto</label>
              <input name="monto" type="number" step="0.01" required />
            </div>
            <div className="field full">
              <label>Descripcion</label>
              <textarea name="descripcion" required />
            </div>
            <div className="actions">
              <button className="button" type="submit">
                Enviar a facturacion
              </button>
            </div>
          </form>
        </section>

        <section className="card stack">
          <strong>Integracion</strong>
          <p className="muted">
            Configura `FACTURADOR_URL` apuntando al servicio que reemplaza el endpoint ngrok
            del proyecto original. Asi no acoplamos Selenium dentro del frontend Next.
          </p>
        </section>
      </div>
    </div>
  );
}
