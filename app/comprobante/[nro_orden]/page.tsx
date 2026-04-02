import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { ReceiptPrintTrigger } from "@/components/receipt-print-trigger";
import { getEquipoByOrden } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export default async function ComprobantePage({
  params
}: {
  params: Promise<{ nro_orden: string }>;
}) {
  const { nro_orden } = await params;
  const equipo = await getEquipoByOrden(nro_orden);

  if (!equipo) {
    notFound();
  }

  return (
    <main className="receipt-page">
      <ReceiptPrintTrigger />
      <div className="receipt-actions no-print">
        <Link className="button secondary" href="/reparaciones">
          Volver
        </Link>
        <PrintButton />
      </div>

      <section className="receipt-paper">
        <div className="receipt-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Servicell"
            className="receipt-logo"
            src="https://res.cloudinary.com/dqsacd9ez/image/upload/v1775083849/logo_1_cd2ojk.png"
          />
          <div><strong>SERVICELL</strong></div>
          <div>Av. Rivadavia esq. San Martin</div>
          <div>Cel: 3804717316 - La Rioja</div>
        </div>

        <div className="receipt-separator" />

        <div className="receipt-data">
          <p><strong>Cliente:</strong> {equipo.nombre_cliente}</p>
          <p><strong>Marca:</strong> {equipo.marca} / {equipo.modelo}</p>
          <p><strong>IMEI:</strong> ....................................</p>
          <p><strong>Patron:</strong></p>
          <div className="receipt-pattern">
            <pre>{`○   ○   ○
○   ○   ○
○   ○   ○`}</pre>
          </div>
          <p className="receipt-center receipt-help">Dibuje el patron de desbloqueo</p>
          <p><strong>Telefono:</strong> {equipo.telefono}</p>
          <p><strong>Reparacion:</strong> {equipo.tipo_reparacion}</p>
          <p><strong>Precio:</strong> {formatCurrency(equipo.monto)}</p>
          <p><strong>Fecha:</strong> {equipo.fecha}</p>
          <p><strong>Orden N°:</strong> {equipo.nro_orden}</p>
          {equipo.observaciones ? <p><strong>Observaciones:</strong> {equipo.observaciones}</p> : null}
        </div>

        <div className="receipt-separator" />

        <p className="receipt-note">
          Sres. Clientes: Los equipos que no sean retirados dentro de los 30 dias desde su recepcion
          tendran un recargo del 20% sobre el precio pactado. Transcurridos 45 dias desde la fecha de
          recepcion, se considerara que el cliente ha desistido de su retiro, quedando el equipo en
          condicion de abandono voluntario, conforme a lo previsto por el Codigo Civil y Comercial de la
          Nacion. En ese supuesto, SERVICELL podra disponer del equipo en concepto de compensacion por
          los servicios prestados y los gastos de guarda. SERVICELL no se responsabiliza por la perdida
          parcial o total de la informacion contenida en el equipo, ni por su procedencia o titularidad.
          Para retirar su equipo, debe presentar este comprobante.
        </p>

        <div className="receipt-signatures">
          <div className="receipt-signature">
            Cliente
            {equipo.firma_cliente ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="Firma del cliente" src={equipo.firma_cliente} />
            ) : null}
          </div>
          <div className="receipt-signature">Encargado</div>
        </div>
      </section>
    </main>
  );
}
