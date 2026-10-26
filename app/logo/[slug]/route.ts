import { PADRAO_SLUG } from "@/lib/agenda";
import { criarClienteAnonimo } from "@/lib/supabase/anon";

function decodificar(valor: string): Buffer {
  return valor.startsWith("\\x") ? Buffer.from(valor.slice(2), "hex") : Buffer.from(valor, "base64");
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!PADRAO_SLUG.test(slug)) return new Response(null, { status: 404 });

  const { data } = await criarClienteAnonimo().rpc("logo_por_slug", { p_slug: slug });
  const logo = data?.[0];
  if (!logo) return new Response(null, { status: 404 });

  const versionada = new URL(request.url).searchParams.has("v");
  return new Response(new Uint8Array(decodificar(logo.conteudo)), {
    headers: {
      "Content-Type": logo.tipo,
      "Cache-Control": versionada ? "public, max-age=31536000, immutable" : "public, max-age=60",
    },
  });
}
