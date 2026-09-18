import type { AvisoParcela } from "./tipos";

const ETIQUETA_SEVERIDAD: Record<string, string> = {
  info: "Información",
  aviso: "Aviso",
  alerta: "Alerta",
  critica: "Crítico",
};

function etiqueta(severidad: string): string {
  return ETIQUETA_SEVERIDAD[severidad] ?? severidad;
}

export function formatearAviso(aviso: AvisoParcela): string {
  const { alerta } = aviso;
  return [
    `[${etiqueta(alerta.severidad)}] ${alerta.titulo}`,
    `Parcela: ${aviso.parcelaNombre}`,
    alerta.mensaje,
    `Motivo: ${alerta.regla}`,
  ].join("\n");
}

export function asuntoAviso(aviso: AvisoParcela): string {
  return `${etiqueta(aviso.alerta.severidad)}: ${aviso.alerta.titulo} — ${aviso.parcelaNombre}`;
}
