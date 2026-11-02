export function Estrela({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 0c.7 6.6 5.4 11.3 12 12-6.6.7-11.3 5.4-12 12-.7-6.6-5.4-11.3-12-12C6.6 11.3 11.3 6.6 12 0Z" />
    </svg>
  );
}

export function Brilhos() {
  return (
    <span className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      <Estrela className="cintila absolute top-5 right-6 size-4 text-white" />
      <Estrela className="cintila absolute top-14 right-16 size-2.5 text-white/80 [animation-delay:-0.8s]" />
      <Estrela className="cintila absolute right-9 bottom-6 size-3 text-white/90 [animation-delay:-1.6s]" />
    </span>
  );
}
