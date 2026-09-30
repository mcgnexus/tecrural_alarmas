import type { OfficialWarning } from "@/lib/dominio/proveedores";

export type FenomenoOficial = "lluvia" | "helada" | "viento";

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function fenomenoOficial(aviso: Pick<OfficialWarning, "phenomenon" | "headline">): FenomenoOficial | null {
  const texto = normalizar(`${aviso.phenomenon} ${aviso.headline}`);
  if (/lluvia|precipitacion/.test(texto)) return "lluvia";
  if (/helada|temperaturas? minimas?|temperaturas? bajas?/.test(texto)) return "helada";
  if (/viento|rachas/.test(texto)) return "viento";
  return null;
}

export function etiquetaFenomenoOficial(fenomeno: FenomenoOficial): string {
  switch (fenomeno) {
    case "lluvia": return "Lluvia · AEMET";
    case "helada": return "Temperatura mínima · AEMET";
    case "viento": return "Viento · AEMET";
  }
}

export function emojiFenomenoOficial(fenomeno: FenomenoOficial): string {
  switch (fenomeno) {
    case "lluvia": return "🌧️";
    case "helada": return "❄️";
    case "viento": return "💨";
  }
}

export function avisoVigente(aviso: Pick<OfficialWarning, "startsAt" | "endsAt">, ahora = Date.now()): boolean {
  const inicio = Date.parse(aviso.startsAt);
  const fin = Date.parse(aviso.endsAt);
  const horizonte = ahora + 72 * 60 * 60 * 1000;
  return (!Number.isFinite(inicio) || inicio <= horizonte) && (!Number.isFinite(fin) || fin >= ahora);
}
