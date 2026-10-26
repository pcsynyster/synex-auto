import { SimboloSynex } from "@/components/ui/marca";

export function RodapeSynex({ texto = "Tecnologia" }: { texto?: string }) {
  return (
    <footer className="mt-auto flex items-center justify-center gap-2 pt-8 text-xs text-suave">
      <span>{texto}</span>
      <SimboloSynex className="w-4" />
      <span className="font-semibold tracking-wide text-texto/80">Synex Sistemas</span>
    </footer>
  );
}
