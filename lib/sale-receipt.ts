import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { SaleReceipt } from "@/lib/types";

const SALE_RECEIPT_COOKIE = "servicell_sale_receipt";

function getSecret() {
  return process.env.SESSION_SECRET || "clave_default_dev";
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function encode(receipt: SaleReceipt) {
  const payload = Buffer.from(JSON.stringify(receipt)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(raw: string | undefined): SaleReceipt | null {
  if (!raw) {
    return null;
  }

  const [payload, signature] = raw.split(".");
  if (!payload || !signature || sign(payload) !== signature) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SaleReceipt;
  } catch {
    return null;
  }
}

export async function getLastSaleReceipt() {
  const store = await cookies();
  return decode(store.get(SALE_RECEIPT_COOKIE)?.value);
}

export async function setLastSaleReceipt(receipt: SaleReceipt) {
  const store = await cookies();
  store.set(SALE_RECEIPT_COOKIE, encode(receipt), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 2
  });
}
