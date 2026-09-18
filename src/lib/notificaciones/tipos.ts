import type { Alerta, Canal, EstadoNotificacion } from "@/lib/dominio/tipos";
import type { CulturaId } from "@/lib/cultivos/catalogo";

export type { Canal, EstadoNotificacion };

export interface AvisoParcela {
  parcelaId: string;
  parcelaNombre: string;
  cultivo: CulturaId;
  alerta: Alerta;
}

export interface ResultadoEnvio {
  ok: boolean;
  detalle?: string;
  error?: string;
}

export interface Notificador {
  canal: Canal;
  configurado(): boolean;
  enviar(destino: string, aviso: AvisoParcela): Promise<ResultadoEnvio>;
}
