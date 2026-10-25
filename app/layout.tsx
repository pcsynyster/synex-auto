import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Synex Auto", template: "%s | Synex Auto" },
  description: "Ordens de serviço, vistoria fotográfica e planos mensais para estética automotiva.",
  applicationName: "Synex Auto",
  appleWebApp: { capable: true, title: "Synex Auto", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
