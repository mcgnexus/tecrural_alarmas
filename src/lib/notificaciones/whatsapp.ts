import { crearLogger } from "@/lib/log/logger";
import { formatearAviso } from "./mensaje";
import type { AvisoParcela, Notificador, ResultadoEnvio } from "./tipos";

const log = crearLogger("notificaciones.whatsapp");

const VERSION_API = "v21.0";

export const notificadorWhatsapp: Notificador = {
  canal: "whatsapp",
  configurado: () =>
    Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID),
  async enviar(destino: string, aviso: AvisoParcela): Promise<ResultadoEnvio> {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    if (!token || !phoneId) {
      return {
        ok: false,
        error: "WHATSAPP_TOKEN/WHATSAPP_PHONE_ID no configurados",
      };
    }

    const inicio = Date.now();
    try {
      const respuesta = await fetch(
        `https://graph.facebook.com/${VERSION_API}/${phoneId}/messages`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: destino,
            type: "text",
            text: { body: formatearAviso(aviso) },
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!respuesta.ok) {
        throw new Error(`WhatsApp HTTP ${respuesta.status}`);
      }
      log.info("notificacion.whatsapp.ok", {
        external_source: "whatsapp",
        duracion_ms: Date.now() - inicio,
      });
      return { ok: true, detalle: "enviado por WhatsApp" };
    } catch (error) {
      log.error(
        "notificacion.whatsapp.error",
        { external_source: "whatsapp", duracion_ms: Date.now() - inicio },
        error,
      );
      return {
        ok: false,
        error: error instanceof Error ? error.message : "error de WhatsApp",
      };
    }
  },
};
