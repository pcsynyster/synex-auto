"use client";

import { useState } from "react";

export function CopiarLink({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copie o link:", link);
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="h-10 shrink-0 rounded-full bg-texto px-4 text-sm font-semibold text-fundo transition-colors hover:bg-white"
    >
      {copiado ? "Copiado" : "Copiar"}
    </button>
  );
}
