import { loginAction } from "@/app/actions";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;
  const session = await getSession();

  if (session) {
    redirect("/inicio");
  }

  return (
    <main className="hero">
      <div className="hero-card">
        <section className="hero-panel">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Servicell"
            className="hero-logo-image"
            src="https://res.cloudinary.com/dqsacd9ez/image/upload/v1775078847/servi_ivbksu.png"
          />
          <h1>
            El sistema de gestion <span className="accent">mas moderno</span> para tu local
          </h1>
          <p>
            Ventas, stock, caja y reparaciones en una sola plataforma conectada a tu base real.
          </p>
        </section>

        <section className="hero-form">
          <div className="page-head" style={{ marginBottom: 18 }}>
            <div>
              <h1 style={{ fontSize: "1.85rem" }}>Bienvenido</h1>
              <p>Usa el mismo usuario y contrasena que ya existe en la tabla `usuarios`.</p>
            </div>
          </div>

          {error ? <div className="notice">{error}</div> : null}

          <form action={loginAction} className="stack">
            <div className="field">
              <label htmlFor="username">Usuario</label>
              <input id="username" name="username" placeholder="admin" required />
            </div>
            <div className="field">
              <label htmlFor="password">Contrasena</label>
              <input id="password" name="password" placeholder="********" type="password" required />
            </div>
            <button className="button" style={{ width: "100%", marginTop: 8 }} type="submit">
              Entrar al sistema
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
