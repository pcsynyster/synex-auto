import Image from "next/image";

export function LogoSynex({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/brand/synex-horizontal.png"
      alt="Synex Sistemas"
      width={340}
      height={119}
      priority
      className={`h-auto ${className}`}
    />
  );
}

export function SimboloSynex({ className = "" }: { className?: string }) {
  return <Image src="/brand/synex-s.png" alt="" width={264} height={232} className={`h-auto ${className}`} aria-hidden="true" />;
}
