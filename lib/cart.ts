import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { CartItem } from "@/lib/types";

const CART_COOKIE = "servicell_cart";

function getSecret() {
  return process.env.SESSION_SECRET || "clave_default_dev";
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function encode(items: CartItem[]) {
  const payload = Buffer.from(JSON.stringify(items)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(raw: string | undefined) {
  if (!raw) {
    return [];
  }

  const [payload, signature] = raw.split(".");
  if (!payload || !signature || sign(payload) !== signature) {
    return [];
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as CartItem[];
  } catch {
    return [];
  }
}

export async function getCart() {
  const store = await cookies();
  return decode(store.get(CART_COOKIE)?.value);
}

export async function setCart(items: CartItem[]) {
  const store = await cookies();
  store.set(CART_COOKIE, encode(items), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearCart() {
  const store = await cookies();
  store.delete(CART_COOKIE);
}
