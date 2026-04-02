import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import type { SessionUser } from "@/lib/types";

const SESSION_COOKIE = "servicell_session";

function getSecret() {
  return process.env.SESSION_SECRET || "clave_default_dev";
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function encodeSession(user: SessionUser) {
  const payload = Buffer.from(JSON.stringify(user)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeSession(raw: string | undefined): SessionUser | null {
  if (!raw) {
    return null;
  }

  const [payload, signature] = raw.split(".");
  if (!payload || !signature || sign(payload) !== signature) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession() {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function loginWithPassword(username: string, password: string) {
  let rows: Array<{ username: string; password: string; role: string }> = [];

  try {
    const result = await sql<{ username: string; password: string; role: string }>(
      "SELECT username, password, role FROM usuarios WHERE username = $1 LIMIT 1",
      [username]
    );
    rows = result.rows;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo conectar a la base de datos para iniciar sesion.";
    throw new Error(message);
  }

  const user = rows[0];
  if (!user || user.password !== password) {
    return null;
  }

  const session: SessionUser = {
    username: user.username,
    role: user.role
  };

  const store = await cookies();
  store.set(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return session;
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
