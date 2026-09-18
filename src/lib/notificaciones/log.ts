import { crearLogger } from "@/lib/log/logger";
import { formatearAviso } from "./mensaje";
import type { AvisoParcela, Notificador, ResultadoEnvio } from "./tipos";

const log = crearLogger("notificaciones.log");

/**
 * Canal de desarrollo/pruebas: no envía nada, solo registra el aviso.
 * No se registra el destino (puede contener datos personales).
 */
export const notificadorLog: Notificador = {
  canal: "log",
  configurado: () => true,
  async enviar(_destino: string, aviso: AvisoParcela): Promise<ResultadoEnvio> {
    log.info("notificacion.log.registrada", {
      external_source: "log",
      plot_id: aviso.parcelaId,
      data: { mensaje: formatearAviso(aviso) },
    });
    return { ok: true, detalle: "registrado en log" };
  },
};
