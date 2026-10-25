import { formatarMoeda } from "@/lib/formato";
import type { ServicoAvulso } from "@/types/database.types";

export function ResumoServicos({ servicos, total }: { servicos: ServicoAvulso[]; total: number }) {
  return (
    <section className="cartao p-5">
      <h2 className="text-sm font-semibold">Serviços</h2>
      {servicos.length > 0 ? (
        <ul className="mt-3 grid gap-2">
          {servicos.map((servico, indice) => (
            <li key={`${servico.nome}-${indice}`} className="flex justify-between gap-4 text-sm">
              <span className="text-suave">{servico.nome}</span>
              <span className="font-mono">{formatarMoeda(servico.valor)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-suave">Nenhum valor adicional nesta ordem.</p>
      )}
      <div className="mt-3 flex justify-between border-t border-borda pt-3 text-sm font-semibold">
        <span>Total</span>
        <span className="font-mono">{formatarMoeda(total)}</span>
      </div>
    </section>
  );
}
