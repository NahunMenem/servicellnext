import Link from "next/link";

export default function NotFound() {
  return (
    <main className="hero">
      <div className="hero-card" style={{ display: "block", maxWidth: 640 }}>
        <section className="hero-form">
          <div className="stack">
            <div className="pill">404</div>
            <h1 style={{ margin: 0, fontSize: "2rem" }}>No se encontro la pagina</h1>
            <p className="muted">
              La ruta que buscaste no existe o el registro solicitado ya no esta disponible.
            </p>
            <div className="actions">
              <Link className="button" href="/inicio">
                Volver al inicio
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
