"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/painel/agenda", rotulo: "Agenda", ativa: (caminho: string) => (caminho.startsWith("/painel/agenda") && !caminho.startsWith("/painel/agenda/config")) || caminho.startsWith("/painel/novo") },
  { href: "/painel/resumo", rotulo: "Resumo", ativa: (caminho: string) => caminho.startsWith("/painel/resumo") },
  { href: "/painel/agenda/config", rotulo: "Ajustes", ativa: (caminho: string) => caminho.startsWith("/painel/agenda/config") },
];

export function AbasPainel({ pendentes }: { pendentes: number }) {
  const caminho = usePathname();

  return (
    <nav className="grid grid-cols-3 gap-1 rounded-full border border-borda bg-elevado/60 p-1" aria-label="Seções do painel">
      {ABAS.map((aba) => {
        const ativa = aba.ativa(caminho);
        return (
          <Link
            key={aba.href}
            href={aba.href}
            aria-current={ativa ? "page" : undefined}
            className={`flex h-9 items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors ${
              ativa ? "bg-white text-texto shadow-[0_1px_3px_rgba(0,0,0,0.1)]" : "text-suave hover:text-texto"
            }`}
          >
            {aba.rotulo}
            {aba.href === "/painel/agenda" && pendentes > 0 && (
              <span
                className={`grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold ${
                  ativa ? "brilho text-white" : "brilho text-white"
                }`}
              >
                {pendentes}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
