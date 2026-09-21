import { createHash } from "node:crypto";
import { CULTIVOS_RAIF, esDominioOficialRaif, MUNICIPIOS_RAIF } from "./config";

export const RAIF_EXTRACTOR_VERSION = "rss-article-v1";

export type RaifCoverage = "municipal" | "comarcal" | "provincial" | null;
export type RaifExtractionStatus = "article" | "pdf_pending" | "review" | "rejected";

export interface RaifPdfLink {
  url: string;
  sourcePage: number | null;
}

export interface RaifRssItem {
  guid: string;
  title: string;
  link: string;
  publishedAt: string | null;
  categories: string[];
  contentEncoded: string;
}

export interface RaifNormalizedAlert {
  externalId: string;
  title: string;
  summary: string | null;
  technicalDescription: string | null;
  cropSlug: string | null;
  pestOrDisease: string | null;
  province: string | null;
  municipality: string | null;
  region: string | null;
  coverage: RaifCoverage;
  severity: string | null;
  publishedAt: string | null;
  validFrom: string | null;
  validTo: string | null;
  recommendation: string | null;
  sourceArticleUrl: string;
  sourcePdfUrl: string | null;
  sourcePage: number | null;
  sourceHash: string | null;
  evidenceText: string | null;
  extractionVersion: string;
  extractionStatus: RaifExtractionStatus;
  extractionConfidence: number;
  pdfLinks: RaifPdfLink[];
}

function decode(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function campo(xml: string, nombre: string): string {
  const match = xml.match(new RegExp(`<${nombre}(?:\\s[^>]*)?>([\\s\\S]*?)</${nombre}>`, "i"));
  return match ? decode(match[1] ?? "") : "";
}

function textoPlano(html: string): string {
  return decode(html).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizar(valor: string): string {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function cultivoDe(texto: string, categorias: string[]): string | null {
  const fuente = normalizar(`${texto} ${categorias.join(" ")}`);
  return CULTIVOS_RAIF.find((cultivo) => fuente.includes(normalizar(cultivo.nombre)))?.slug ?? null;
}

function municipioDe(texto: string): string | null {
  const encontrado = MUNICIPIOS_RAIF.find((municipio) => new RegExp(`\\b${municipio.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(texto));
  return encontrado ?? null;
}

function extraerProvincia(texto: string): string | null {
  return /provincia\s+de\s+granada|granada/i.test(texto) ? "Granada" : null;
}

function pdfsDe(html: string): RaifPdfLink[] {
  const encontrados = [...html.matchAll(/href=["']([^"']+\.pdf(?:#[^"']*)?)["']/gi)].map((match) => match[1]!.replace(/&amp;/g, "&"));
  return [...new Set(encontrados)].filter(esDominioOficialRaif).map((url) => ({ url, sourcePage: null }));
}

function resumenDe(texto: string): string | null {
  const parrafos = texto.split(/(?<=[.!?])\s+/).filter((p) => p.length > 50);
  return parrafos[0] ?? null;
}

function fechaIso(valor: string | null): string | null {
  if (!valor) return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

export function parsearRaifRss(xml: string): RaifRssItem[] {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => {
    const bloque = match[0];
    return {
      guid: campo(bloque, "guid") || campo(bloque, "link"),
      title: campo(bloque, "title"),
      link: campo(bloque, "link"),
      publishedAt: campo(bloque, "pubDate") || null,
      categories: [...bloque.matchAll(/<category(?:\s[^>]*)?>([\s\S]*?)<\/category>/gi)].map((m) => decode(m[1] ?? "")),
      contentEncoded: campo(bloque, "content:encoded"),
    };
  }).filter((item) => item.guid && item.title && esDominioOficialRaif(item.link));
}

export function normalizarRaifItem(item: RaifRssItem): RaifNormalizedAlert {
  const html = item.contentEncoded;
  const texto = textoPlano(html);
  const pdfLinks = pdfsDe(html);
  const municipio = municipioDe(texto);
  const provincia = extraerProvincia(texto);
  const coverage: RaifCoverage = municipio ? "municipal" : /comarca|comarcal/i.test(texto) ? "comarcal" : provincia ? "provincial" : null;
  const cropSlug = cultivoDe(`${item.title} ${texto}`, item.categories);
  const confidence = cropSlug ? (pdfLinks.length ? 0.95 : 0.8) : 0.65;
  return {
    externalId: item.guid,
    title: item.title,
    summary: resumenDe(texto),
    technicalDescription: texto || null,
    cropSlug,
    pestOrDisease: /(?:plaga|enfermedad|repilo|monilia|gusano|mosca|pudenta|oidio|mildiu)/i.test(item.title) ? item.title : null,
    province: provincia,
    municipality: municipio,
    region: /costa tropical/i.test(texto) ? "Costa Tropical" : /altiplano/i.test(texto) ? "Altiplano de Granada" : null,
    coverage,
    severity: null,
    publishedAt: fechaIso(item.publishedAt),
    validFrom: null,
    validTo: null,
    recommendation: null,
    sourceArticleUrl: item.link,
    sourcePdfUrl: pdfLinks[0]?.url ?? null,
    sourcePage: null,
    sourceHash: null,
    evidenceText: texto || null,
    extractionVersion: RAIF_EXTRACTOR_VERSION,
    extractionStatus: pdfLinks.length ? "pdf_pending" : "article",
    extractionConfidence: confidence,
    pdfLinks,
  };
}

export function hashPdf(buffer: ArrayBuffer): string {
  return createHash("sha256").update(Buffer.from(buffer)).digest("hex");
}
