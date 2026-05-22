import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "JasoDatos",
    template: "%s | JasoDatos",
  },
  description:
    "JasoDatos convierte datos comerciales en indicadores, alertas y acciones para tomar mejores decisiones.",
  applicationName: "JasoDatos",
  manifest: "/site.webmanifest",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}