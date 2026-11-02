import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Synex Agenda", template: "%s | Synex Agenda" },
  description: "Agenda online para salões de unhas: a cliente marca pelo link, você confirma no WhatsApp e acompanha o faturamento.",
  applicationName: "Synex Agenda",
  appleWebApp: { capable: true, title: "Synex Agenda", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
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
