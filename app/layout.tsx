import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIBI CBN",
  description: "Sistema Integral de Business Intelligence",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
