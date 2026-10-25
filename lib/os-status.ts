import { STATUS_OS, type StatusOS } from "@/types/database.types";

export const ROTULO_STATUS: Record<StatusOS, string> = {
  recebido: "Recebido",
  lavando: "Lavando",
  acabamento: "Acabamento",
  pronto: "Pronto para retirada",
  entregue: "Entregue",
};

export function indiceStatus(status: StatusOS): number {
  return STATUS_OS.indexOf(status);
}

export function progressoStatus(status: StatusOS): number {
  return Math.round((indiceStatus(status) / (STATUS_OS.length - 1)) * 100);
}

export function proximoStatus(status: StatusOS): StatusOS | null {
  return STATUS_OS[indiceStatus(status) + 1] ?? null;
}
