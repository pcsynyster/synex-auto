"use client";

import { useEffect, useState } from "react";
import { AgendarCliente } from "@/components/agenda/agendar-cliente";
import { LogoLoja } from "@/components/ui/logo-loja";
import { Brilhos } from "@/components/ui/brilhos";
import type { AgendaPublica } from "@/lib/agenda";

const TONS = [
  { nome: "Nude", cor: "#d4937a", escuro: "#a9644d" },
  { nome: "Rosé", cor: "#e27a99", escuro: "#bb4d73" },
  { nome: "Coral", cor: "#ee5f4c", escuro: "#c43b2b" },
  { nome: "Cereja", cor: "#d41c44", escuro: "#990d2b" },
  { nome: "Framboesa", cor: "#c2185b", escuro: "#7f0b3b" },
  { nome: "Ameixa", cor: "#6d1f4a", escuro: "#3b0c26" },
] as const;

type Tom = (typeof TONS)[number];

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

const DEDOS = [
  { cx: 62, topo: 74, largura: 34, giro: -6 },
  { cx: 106, topo: 40, largura: 38, giro: -2 },
  { cx: 152, topo: 28, largura: 40, giro: 0 },
  { cx: 198, topo: 44, largura: 38, giro: 3 },
  { cx: 246, topo: 100, largura: 40, giro: 16 },
];

function Mao({ cor }: { cor: string }) {
  return (
    <svg viewBox="0 0 300 170" className="h-auto w-full max-w-[19rem]" aria-hidden="true">
      <defs>
        <linearGradient id="pele" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6d6c6" />
          <stop offset="1" stopColor="#eab9a3" />
        </linearGradient>
        <linearGradient id="sumir" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.55" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="mascara-mao">
          <rect width="300" height="170" fill="url(#sumir)" />
        </mask>
      </defs>
      <g mask="url(#mascara-mao)">
        <rect x="44" y="128" width="228" height="90" rx="44" fill="url(#pele)" />
        {DEDOS.map(({ cx, topo, largura, giro }) => {
          const meia = largura / 2;
          const unha = `M ${cx - largura * 0.34} ${topo + largura * 0.95} C ${cx - largura * 0.37} ${topo + largura * 0.2} ${cx - largura * 0.12} ${topo - largura * 0.3} ${cx} ${topo - largura * 0.38} C ${cx + largura * 0.12} ${topo - largura * 0.3} ${cx + largura * 0.37} ${topo + largura * 0.2} ${cx + largura * 0.34} ${topo + largura * 0.95} Q ${cx} ${topo + largura * 1.08} ${cx - largura * 0.34} ${topo + largura * 0.95} Z`;
          return (
            <g key={cx} transform={`rotate(${giro} ${cx} 170)`}>
              <rect x={cx - meia} y={topo} width={largura} height={200} rx={meia} fill="url(#pele)" />
              <rect x={cx - meia + 3} y={topo + 6} width={4} height={60} rx={2} fill="#fff" opacity="0.25" />
              <path d={unha} style={{ fill: cor, transition: "fill 0.7s ease" }} />
              <path
                d={`M ${cx - largura * 0.2} ${topo + largura * 0.6} C ${cx - largura * 0.22} ${topo + largura * 0.1} ${cx - largura * 0.08} ${topo - largura * 0.18} ${cx - largura * 0.02} ${topo - largura * 0.22}`}
                stroke="#fff"
                strokeWidth={2.4}
                strokeLinecap="round"
                fill="none"
                opacity="0.55"
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function Vidro({ tom, ativo, aoEscolher }: { tom: Tom; ativo: boolean; aoEscolher: () => void }) {
  return (
    <button
      type="button"
      onClick={aoEscolher}
      aria-pressed={ativo}
      aria-label={`Cor ${tom.nome}`}
      className={`group flex flex-col items-center gap-1.5 transition-transform duration-300 ${ativo ? "-translate-y-2" : "hover:-translate-y-1"}`}
    >
      <svg viewBox="0 0 40 74" className="h-16 w-auto drop-shadow-[0_8px_10px_rgba(60,0,30,0.35)]" aria-hidden="true">
        <defs>
          <linearGradient id={`vidro-${tom.nome}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="0.35" stopColor="#fff" stopOpacity="0.05" />
            <stop offset="1" stopColor="#000" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <rect x="13" y="0" width="14" height="26" rx="3" fill="#1d1d1f" />
        <rect x="16" y="3" width="2.5" height="20" rx="1.2" fill="#fff" opacity="0.28" />
        <rect x="11" y="24" width="18" height="6" rx="1.5" fill="#2c2c2e" />
        <rect x="4" y="29" width="32" height="44" rx="9" fill={tom.cor} />
        <rect x="4" y="29" width="32" height="44" rx="9" fill={`url(#vidro-${tom.nome})`} />
        <rect x="8" y="34" width="4" height="28" rx="2" fill="#fff" opacity="0.5" />
      </svg>
      <span className={`text-[10px] font-medium tracking-wide transition-opacity ${ativo ? "opacity-100" : "opacity-70"}`}>{tom.nome}</span>
      <span className={`h-1 w-1 rounded-full bg-white transition-opacity ${ativo ? "opacity-100" : "opacity-0"}`} />
    </button>
  );
}

export function Vitrine({ slug, agenda, logoUrl, linkWhatsapp }: { slug: string; agenda: AgendaPublica; logoUrl: string | null; linkWhatsapp: string }) {
  const [tom, setTom] = useState<Tom | null>(null);

  useEffect(() => {
    const raiz = document.documentElement;
    if (tom) {
      raiz.style.setProperty("--tom", tom.cor);
      raiz.style.setProperty("--tom-2", tom.escuro);
    } else {
      raiz.style.removeProperty("--tom");
      raiz.style.removeProperty("--tom-2");
    }
  }, [tom]);

  useEffect(() => {
    const raiz = document.documentElement;
    return () => {
      raiz.style.removeProperty("--tom");
      raiz.style.removeProperty("--tom-2");
    };
  }, []);

  const selos = ["Marque em 1 minuto", "Confirmação no WhatsApp", ...(agenda.profissionais.length > 1 ? ["Escolha sua profissional"] : [])];

  return (
    <>
      <header className="destaque-hero grid gap-4 px-5 pt-5 pb-6">
        <Brilhos />
        <div className="flex items-start justify-between gap-3">
          <div className="rounded-[1.15rem] bg-white/30 p-1 shadow-[0_0_0_1px_rgba(255,255,255,0.55),0_12px_30px_-8px_rgba(60,0,30,0.55)]">
            {logoUrl ? (
              <LogoLoja url={logoUrl} nome={agenda.nome} />
            ) : (
              <span className="font-serifa grid size-14 place-items-center rounded-2xl bg-white text-2xl text-[var(--tom)] italic transition-colors">{iniciais(agenda.nome)}</span>
            )}
          </div>
          <a
            href={linkWhatsapp}
            className="shrink-0 rounded-full bg-white/20 px-3.5 py-1.5 text-sm font-medium text-white ring-1 ring-white/45 backdrop-blur transition-colors hover:bg-white/30"
          >
            WhatsApp
          </a>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80">Agendamento online</p>
          <h1 className="mt-1.5 text-[2rem] leading-[1.05] font-semibold tracking-tight [text-shadow:0_2px_18px_rgba(60,0,30,0.35)]">{agenda.nome}</h1>
          {agenda.cidade && <p className="mt-1.5 text-sm text-white/85">{agenda.cidade}</p>}
        </div>

        <div className="relative grid justify-items-center gap-1 pt-1">
          <p
            key={tom?.nome ?? "inicio"}
            className={`font-serifa animate-[surgir_0.6s_ease] leading-none italic [text-shadow:0_4px_24px_rgba(60,0,30,0.3)] ${tom ? "text-[3.6rem]" : "text-[2.6rem]"}`}
          >
            {tom ? tom.nome : "Qual cor hoje?"}
          </p>
          <Mao cor={tom?.cor ?? "#f2b8c9"} />
          <p className="-mt-3 text-center text-xs text-white/85">Toque num vidrinho para escolher a cor do seu atendimento.</p>
        </div>

        <div className="-mx-2 flex items-end justify-between gap-1 px-1">
          {TONS.map((item) => (
            <Vidro key={item.nome} tom={item} ativo={tom?.nome === item.nome} aoEscolher={() => setTom(tom?.nome === item.nome ? null : item)} />
          ))}
        </div>

        <ul className="flex flex-wrap gap-2 text-xs font-medium">
          {selos.map((item) => (
            <li key={item} className="rounded-full bg-white/20 px-3 py-1.5 ring-1 ring-white/40 backdrop-blur">
              {item}
            </li>
          ))}
        </ul>
      </header>

      {agenda.servicos.length > 0 ? (
        <AgendarCliente slug={slug} agenda={agenda} cor={tom?.nome ?? null} />
      ) : (
        <p className="cartao p-6 text-center text-sm text-suave">Nenhum serviço disponível para agendamento no momento.</p>
      )}
    </>
  );
}
