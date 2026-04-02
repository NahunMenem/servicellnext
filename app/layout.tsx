import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Servicell Next",
  description: "Sistema de ventas, stock y reparaciones modernizado en Next.js"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
