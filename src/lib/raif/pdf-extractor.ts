import { createHash } from "node:crypto";
import { PDFParse } from "pdf-parse";
import { createWorker } from "tesseract.js";

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_PAGES = 8;
const MIN_NATIVE_CHARS = 120;

export type PdfExtractionStatus = "native" | "ocr" | "review";

export interface PdfExtraction {
  hash: string;
  text: string;
  status: PdfExtractionStatus;
  confidence: number;
  sourcePage: number | null;
}

function limpiarTexto(texto: string): string {
  return texto
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/(?:página|pagina)\s+\d+(?:\s+de\s+\d+)?/gi, "")
    .trim();
}

function esTextoSuficiente(texto: string): boolean {
  const limpio = limpiarTexto(texto);
  const letras = (limpio.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) ?? []).length;
  return limpio.length >= MIN_NATIVE_CHARS && letras >= 40;
}

function paginaDeEvidencia(texto: string): number | null {
  const paginas = texto.split(/\f|\n\s*\n\s*\n/).map(limpiarTexto);
  const indice = paginas.findIndex((pagina) => /plaga|enfermedad|recomend|cultivo/i.test(pagina));
  return indice >= 0 ? indice + 1 : null;
}

export function extraerRecomendacion(texto: string): string | null {
  const parrafos = limpiarTexto(texto).split(/\n\s*\n|(?<=[.!?])\s+/).map((parrafo) => parrafo.trim());
  return parrafos.find((parrafo) => /\b(recomienda|se recomienda|recomendaciones|medidas recomendadas|deberá|debe realizar)\b/i.test(parrafo) && parrafo.length >= 40) ?? null;
}

async function extraerNativo(buffer: Uint8Array): Promise<{ text: string; pages: number }> {
  const parser = new PDFParse({ data: buffer });
  try {
    const resultado = await parser.getText({ first: MAX_PAGES });
    return { text: limpiarTexto(resultado.text ?? ""), pages: resultado.total ?? MAX_PAGES };
  } finally {
    await parser.destroy();
  }
}

async function extraerPorOcr(buffer: Uint8Array): Promise<{ text: string; confidence: number }> {
  const parser = new PDFParse({ data: buffer });
  try {
    const capturas = await parser.getScreenshot({ first: MAX_PAGES, scale: 1.25, imageBuffer: true });
    const worker = await createWorker("spa");
    try {
      const textos: string[] = [];
      const confianzas: number[] = [];
      for (const pagina of capturas.pages) {
        if (!pagina.data) continue;
        const resultado = await worker.recognize(Buffer.from(pagina.data));
        textos.push(resultado.data.text ?? "");
        confianzas.push(Number(resultado.data.confidence ?? 0) / 100);
      }
      return {
        text: limpiarTexto(textos.join("\n\n")),
        confidence: confianzas.length ? confianzas.reduce((total, valor) => total + valor, 0) / confianzas.length : 0,
      };
    } finally {
      await worker.terminate();
    }
  } finally {
    await parser.destroy();
  }
}

export async function extraerPdfRaif(buffer: ArrayBuffer): Promise<PdfExtraction> {
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) throw new Error("PDF fuera de los límites permitidos");
  const bytes = new Uint8Array(buffer);
  const hash = createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  const nativo = await extraerNativo(bytes).catch(() => ({ text: "", pages: 0 }));
  if (esTextoSuficiente(nativo.text)) {
    return { hash, text: nativo.text, status: "native", confidence: 0.98, sourcePage: paginaDeEvidencia(nativo.text) };
  }
  try {
    const ocr = await extraerPorOcr(bytes);
    if (!esTextoSuficiente(ocr.text)) return { hash, text: nativo.text, status: "review", confidence: ocr.confidence, sourcePage: paginaDeEvidencia(nativo.text) };
    return { hash, text: ocr.text, status: "ocr", confidence: ocr.confidence, sourcePage: paginaDeEvidencia(ocr.text) };
  } catch {
    return { hash, text: nativo.text, status: "review", confidence: 0, sourcePage: paginaDeEvidencia(nativo.text) };
  }
}

export async function descargarYExtraerPdfRaif(url: string): Promise<PdfExtraction> {
  const respuesta = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!respuesta.ok) throw new Error(`PDF RAIF HTTP ${respuesta.status}`);
  const contentLength = Number(respuesta.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BYTES) throw new Error("PDF RAIF demasiado grande");
  return extraerPdfRaif(await respuesta.arrayBuffer());
}
