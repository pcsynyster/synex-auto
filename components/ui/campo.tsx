import type { InputHTMLAttributes } from "react";

type CampoProps = InputHTMLAttributes<HTMLInputElement> & { rotulo: string };

export function Campo({ rotulo, className = "", ...props }: CampoProps) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-suave">{rotulo}</span>
      <input
        {...props}
        className={`h-12 w-full min-w-0 rounded-2xl border border-borda bg-elevado px-4 text-base text-texto placeholder:text-suave/60 transition-colors focus:border-prata focus:outline-none ${className}`}
      />
    </label>
  );
}
