export function LogoLoja({ url, nome }: { url: string | null; nome: string }) {
  if (!url) return null;
  return <img src={url} alt={nome} className="size-14 shrink-0 rounded-2xl bg-white object-contain p-1" />;
}
