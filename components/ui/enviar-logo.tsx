"use client";

import { useRef, useState, useTransition } from "react";
import { removerLogo, salvarLogo } from "@/app/actions/logo";

const LADO = 512;

async function prepararImagem(arquivo: File): Promise<string> {
  const bitmap = await createImageBitmap(arquivo);
  const canvas = document.createElement("canvas");
  canvas.width = LADO;
  canvas.height = LADO;
  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("canvas");
  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, LADO, LADO);
  const margem = LADO * 0.06;
  const escala = Math.min((LADO - margem * 2) / bitmap.width, (LADO - margem * 2) / bitmap.height);
  const largura = bitmap.width * escala;
  const altura = bitmap.height * escala;
  contexto.drawImage(bitmap, (LADO - largura) / 2, (LADO - altura) / 2, largura, altura);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.88);
}

type Props = {
  logoUrl: string | null;
  tenantId?: string;
  compacto?: boolean;
};

export function EnviarLogo({ logoUrl, tenantId, compacto = false }: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState<string | null>(logoUrl);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    iniciar(async () => {
      try {
        const dataUrl = await prepararImagem(arquivo);
        const resultado = await salvarLogo(dataUrl, tenantId);
        if (!resultado.ok) return setErro(resultado.erro);
        setPrevia(dataUrl);
      } catch {
        setErro("Não foi possível ler essa imagem.");
      }
    });
  }

  function remover() {
    setErro(null);
    iniciar(async () => {
      const resultado = await removerLogo(tenantId);
      if (!resultado.ok) return setErro(resultado.erro);
      setPrevia(null);
    });
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          className={`grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed border-borda bg-white ${compacto ? "size-12" : "size-20"}`}
          aria-label="Escolher logo"
        >
          {previa ? (
            <img src={previa} alt="Logo" className="size-full object-contain" />
          ) : (
            <span className="text-xs text-fundo/50">Logo</span>
          )}
        </button>
        <div className="grid min-w-0 gap-1">
          <button type="button" onClick={() => entrada.current?.click()} disabled={pendente} className="text-left text-sm font-semibold underline-offset-4 hover:underline">
            {pendente ? "Enviando..." : previa ? "Trocar logo" : "Enviar logo"}
          </button>
          {!compacto && <span className="text-xs text-suave">Aparece no link do WhatsApp e nas páginas do cliente.</span>}
          {previa && !pendente && (
            <button type="button" onClick={remover} className="w-fit text-xs text-suave underline underline-offset-4">
              Remover
            </button>
          )}
        </div>
      </div>
      {erro && <p className="text-xs text-alerta">{erro}</p>}
      <input
        ref={entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(evento) => {
          escolher(evento.target.files?.[0]);
          evento.target.value = "";
        }}
      />
    </div>
  );
}
