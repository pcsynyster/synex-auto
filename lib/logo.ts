import { env } from "@/lib/env";

export function urlLogo(slug: string, versao: number | null): string | null {
  return versao ? `${env.appUrl}/logo/${slug}?v=${versao}` : null;
}

export function imagensCompartilhamento(slug: string, versao: number | null, nome: string) {
  const url = urlLogo(slug, versao);
  return url ? [{ url, width: 512, height: 512, alt: nome }] : undefined;
}
