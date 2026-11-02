import { formatarMoeda } from "@/lib/formato";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function rotulo(periodo: string, porMes: boolean): string {
  const [ano, mes, dia] = periodo.split("-");
  return porMes ? `${MESES[Number(mes) - 1]}/${ano?.slice(2)}` : String(Number(dia));
}

export function GraficoBarras({ serie, porMes, claro = false }: { serie: { periodo: string; valor: number; carros: number }[]; porMes: boolean; claro?: boolean }) {
  const maximo = Math.max(...serie.map((item) => Number(item.valor)), 1);
  const passo = serie.length > 16 ? Math.ceil(serie.length / 8) : 1;

  return (
    <div className="grid gap-2">
      <div className="flex h-36 items-end gap-[3px]">
        {serie.map((item) => (
          <div key={item.periodo} className="group relative flex h-full min-w-0 flex-1 items-end">
            <div
              className={`w-full rounded-t-md ${Number(item.valor) > 0 ? (claro ? "bg-white/90 shadow-[0_0_16px_rgba(255,255,255,0.55)]" : "barra-prata") : claro ? "bg-white/20" : "bg-elevado"}`}
              style={{ height: `${Math.max((Number(item.valor) / maximo) * 100, 3)}%` }}
              title={`${rotulo(item.periodo, porMes)}: ${formatarMoeda(Number(item.valor))} · ${item.carros} ${item.carros === 1 ? "atendimento" : "atendimentos"}`}
            />
          </div>
        ))}
      </div>
      <div className={`flex gap-[3px] text-[10px] tabular-nums ${claro ? "text-white/75" : "text-suave"}`}>
        {serie.map((item, indice) => (
          <span key={item.periodo} className="min-w-0 flex-1 text-center">
            {indice % passo === 0 ? rotulo(item.periodo, porMes) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
