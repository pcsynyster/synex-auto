import type { ButtonHTMLAttributes } from "react";

type BotaoProps = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "primario" | "secundario" };

const VARIANTES = {
  primario: "bg-texto text-fundo hover:bg-white",
  secundario: "border border-borda bg-elevado/60 text-texto hover:border-prata/50",
};

export function Botao({ variante = "primario", className = "", ...props }: BotaoProps) {
  return (
    <button
      {...props}
      className={`h-12 rounded-full px-5 text-sm font-semibold transition-[transform,background-color,border-color] active:scale-[0.98] disabled:opacity-50 ${VARIANTES[variante]} ${className}`}
    />
  );
}
