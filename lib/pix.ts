function campo(id: string, valor: string): string {
  return `${id}${valor.length.toString().padStart(2, "0")}${valor}`;
}

function limpar(texto: string, limite: number): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, limite);
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

type DadosPix = {
  chave: string;
  recebedor: string;
  cidade: string | null;
  valor: number;
  identificador: string;
};

export function gerarPixCopiaECola({ chave, recebedor, cidade, valor, identificador }: DadosPix): string {
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", chave.trim());
  const txid = limpar(identificador, 25).replace(/ /g, "") || "***";

  const corpo = [
    campo("00", "01"),
    campo("26", conta),
    campo("52", "0000"),
    campo("53", "986"),
    valor > 0 ? campo("54", valor.toFixed(2)) : "",
    campo("58", "BR"),
    campo("59", limpar(recebedor, 25) || "RECEBEDOR"),
    campo("60", limpar(cidade ?? "", 15) || "BRASIL"),
    campo("62", campo("05", txid)),
    "6304",
  ].join("");

  return corpo + crc16(corpo);
}
