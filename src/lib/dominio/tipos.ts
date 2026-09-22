import type { CulturaId } from "@/lib/cultivos/catalogo";

// --- Clima: contrato normalizado entre motor meteorológico y agronómico ---

export interface FuenteDatos {
  id: string;
  nombre: string;
  url: string;
  licencia: string;
  consultadaEn: string;
}

export interface CondicionesActuales {
  temperatura: number;
  sensacionTermica: number;
  vientoKmh: number;
  rachaKmh: number;
  precipitacionUltimaHora: number;
  humedadRelativa: number;
}

export interface PrevisionDiaria {
  fecha: string;
  tMin: number;
  tMax: number;
  rachaMaxKmh: number;
  probPrecipitacionMax: number;
  precipitacionTotal: number;
}

export interface ClimaPunto {
  latitud: number;
  longitud: number;
  actual: CondicionesActuales;
  prevision: PrevisionDiaria[];
  fuente: FuenteDatos;
}

// --- Agronomía ---

export interface DemandaHidrica {
  etoMm: number;
  etcMm: number;
  factorKc: number;
  raMm: number;
}

/** Salida del motor agronómico: describe un riesgo, aún no es una alerta notificable. */
export interface HallazgoAgronomico {
  regla: string;
  tipo: TipoAlerta;
  titulo: string;
  mensaje: string;
  severidad: Severidad;
  cultivo: CulturaId;
  fenofase?: string;
  datosUtilizados: string[];
  vigenciaHasta?: string;
}

// --- Alertas ---

export type Severidad = "info" | "aviso" | "alerta" | "critica";

export type TipoAlerta =
  | "helada"
  | "golpe-de-calor"
  | "viento"
  | "demanda-hidrica";

export interface Alerta {
  id: string;
  tipo: TipoAlerta;
  titulo: string;
  mensaje: string;
  severidad: Severidad;
  regla: string;
  cultivo?: CulturaId;
  fenofase?: string;
  emisorAt: string;
  datosUtilizados: string[];
  vigenciaHasta?: string;
  fuente: FuenteDatos;
}

export const ordenSeveridad: Record<Severidad, number> = {
  info: 0,
  aviso: 1,
  alerta: 2,
  critica: 3,
};

export interface ResultadoEvaluacion {
  latitud: number;
  longitud: number;
  cultivo: CulturaId;
  fenofase: string | null;
  evaluadoEl: string;
  alertas: Alerta[];
  demandaHidrica: DemandaHidrica | null;
  fuente: FuenteDatos;
  // Fase 5 — metadatos de evaluación para caducidad y trazabilidad
  estadoEvaluacion?: import("@/lib/alertas/estado").AlertStatus;
  fechaDatos?: string;
  fechaCaducidad?: string;
  errorTecnico?: string;
}

// --- Notificaciones ---

export type Canal = "telegram" | "email" | "whatsapp" | "push" | "log";

export type EstadoNotificacion = "pendiente" | "enviada" | "error";
