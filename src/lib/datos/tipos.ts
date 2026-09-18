import type { CulturaId } from "@/lib/cultivos/catalogo";
import type {
  Canal,
  ResultadoEvaluacion,
  Severidad,
} from "@/lib/dominio/tipos";

export interface ParcelaDto {
  id: string;
  nombre: string;
  cultivo: CulturaId;
  latitud: number;
  longitud: number;
  creadaEl: string;
  ultimaEvaluacion: ResultadoEvaluacion | null;
}

export interface SuscripcionDto {
  id: string;
  parcelaId: string | null;
  canal: Canal;
  destino: string;
  severidadMinima: Severidad;
  activa: boolean;
  creadaEl: string;
}