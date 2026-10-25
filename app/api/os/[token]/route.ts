import { NextResponse } from "next/server";
import { buscarOSPublica } from "@/lib/os-publica";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const os = await buscarOSPublica(token);

  if (!os) {
    return NextResponse.json({ erro: "nao_encontrada" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    { status: os.status, atualizadoEm: os.atualizadoEm, prontoEm: os.prontoEm, entregueEm: os.entregueEm },
    { headers: { "Cache-Control": "no-store" } },
  );
}
