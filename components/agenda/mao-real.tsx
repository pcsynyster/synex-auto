"use client";

import { useEffect, useRef, useState } from "react";

const FOTO = "/vitrine/mao.webp";
const MASCARA = "/vitrine/unhas.png";

type Base = { largura: number; altura: number; pixels: Uint8ClampedArray; mascara: Uint8ClampedArray; mediaLuz: number };

function carregar(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.onload = () => resolve(imagem);
    imagem.onerror = reject;
    imagem.src = src;
  });
}

function hexParaRgb(hex: string): [number, number, number] {
  const valor = Number.parseInt(hex.replace("#", ""), 16);
  return [(valor >> 16) & 255, (valor >> 8) & 255, valor & 255];
}

function pintar(base: Base, cor: string): string {
  const [r, g, b] = hexParaRgb(cor);
  const claridade = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const compressao = 0.55 + (1 - claridade) * 0.45;
  const saida = new Uint8ClampedArray(base.pixels);
  for (let i = 0; i < saida.length; i += 4) {
    const k = (base.mascara[i] ?? 0) / 255;
    if (k <= 0) continue;
    const luz = (0.299 * (base.pixels[i] ?? 0) + 0.587 * (base.pixels[i + 1] ?? 0) + 0.114 * (base.pixels[i + 2] ?? 0)) / 255;
    const relativo = Math.min(Math.max(1 + (luz / base.mediaLuz - 1) * compressao, 0.4), 1.5);
    const brilho = Math.min(Math.max((luz - 0.42) / 0.4, 0), 1) * 0.85;
    const canais = [r, g, b];
    for (let c = 0; c < 3; c++) {
      const tinta = (canais[c] ?? 0) * relativo * (1 - brilho) + 255 * brilho;
      saida[i + c] = (base.pixels[i + c] ?? 0) * (1 - k) + tinta * k;
    }
  }
  const tela = document.createElement("canvas");
  tela.width = base.largura;
  tela.height = base.altura;
  tela.getContext("2d")?.putImageData(new ImageData(saida, base.largura, base.altura), 0, 0);
  return tela.toDataURL("image/png");
}

export function MaoReal({ cor }: { cor: string | null }) {
  const base = useRef<Base | null>(null);
  const [pronta, setPronta] = useState(false);
  const [camadas, setCamadas] = useState<{ cor: string; url: string }[]>([]);

  useEffect(() => {
    let ativo = true;
    Promise.all([carregar(FOTO), carregar(MASCARA)])
      .then(([foto, mascara]) => {
        if (!ativo) return;
        const tela = document.createElement("canvas");
        tela.width = foto.naturalWidth;
        tela.height = foto.naturalHeight;
        const contexto = tela.getContext("2d", { willReadFrequently: true });
        if (!contexto) return;
        contexto.drawImage(foto, 0, 0);
        const pixels = contexto.getImageData(0, 0, tela.width, tela.height).data;
        contexto.clearRect(0, 0, tela.width, tela.height);
        contexto.drawImage(mascara, 0, 0, tela.width, tela.height);
        const dadosMascara = contexto.getImageData(0, 0, tela.width, tela.height).data;
        let soma = 0;
        let total = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if ((dadosMascara[i] ?? 0) > 127) {
            soma += (0.299 * (pixels[i] ?? 0) + 0.587 * (pixels[i + 1] ?? 0) + 0.114 * (pixels[i + 2] ?? 0)) / 255;
            total++;
          }
        }
        base.current = { largura: tela.width, altura: tela.height, pixels, mascara: dadosMascara, mediaLuz: total ? soma / total : 0.35 };
        setPronta(true);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!pronta || !cor || !base.current) return;
    if (camadas.some((item) => item.cor === cor)) return;
    const url = pintar(base.current, cor);
    setCamadas((atual) => [...atual, { cor, url }]);
  }, [cor, pronta, camadas]);

  const visivel = cor && camadas.some((item) => item.cor === cor) ? cor : null;

  return (
    <div className="relative mx-auto aspect-[410/690] w-[min(68vw,15.5rem)] [mask-image:linear-gradient(to_bottom,black_78%,transparent)]">
      <img
        src={FOTO}
        alt="Mão com unhas feitas"
        className={`absolute inset-0 size-full object-contain transition-opacity duration-700 ${visivel ? "opacity-0" : "opacity-100"}`}
      />
      {camadas.map((item) => (
        <img
          key={item.cor}
          src={item.url}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 size-full object-contain transition-opacity duration-700 ${visivel === item.cor ? "opacity-100" : "opacity-0"}`}
        />
      ))}
    </div>
  );
}
