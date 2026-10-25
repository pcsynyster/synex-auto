import type { Metadata } from "next";
import { NovaEntrada } from "@/components/painel/nova-entrada";

export const metadata: Metadata = { title: "Nova entrada" };

export default function PaginaNovaEntrada() {
  return <NovaEntrada />;
}
