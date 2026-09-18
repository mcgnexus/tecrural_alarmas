import type {
  Alerta,
  FuenteDatos,
  Severidad,
  TipoAlerta,
} from "@/lib/dominio/tipos";
import type { CulturaId } from "@/lib/cultivos/catalogo";

export interface CrearAlertaArgs {
  tipo: TipoAlerta;
  titulo: string;
  mensaje: string;
  severidad: Severidad;
  regla: string;
  cultivo?: CulturaId;
  fenofase?: string;
  datosUtilizados: string[];
  vigenciaHasta?: string;
  fuente: FuenteDatos;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function crearAlerta(argumentos: CrearAlertaArgs): Alerta {
  return {
    ...argumentos,
    id: uuid(),
    emisorAt: new Date().toISOString(),
  };
}