import { crearLogger } from "@/lib/log/logger";
import { asuntoAviso, formatearAviso } from "./mensaje";
import type { AvisoParcela, Notificador, ResultadoEnvio } from "./tipos";

const log = crearLogger("notificaciones.email");

const ENDPOINT = "https://api.resend.com/emails";

export const notificadorEmail: Notificador = {
  canal: "email",
  configurado: () =>
    Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
  async enviar(destino: string, aviso: AvisoParcela): Promise<ResultadoEnvio> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      return { ok: false, error: "RESEND_API_KEY/EMAIL_FROM no configurados" };
    }

    const inicio = Date.now();
    try {
      const respuesta = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from,
          to: destino,
          subject: asuntoAviso(aviso),
          text: formatearAviso(aviso),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!respuesta.ok) {
        throw new Error(`Resend HTTP ${respuesta.status}`);
      }
      log.info("notificacion.email.ok", {
        external_source: "resend",
        duracion_ms: Date.now() - inicio,
      });
      return { ok: true, detalle: "enviado por correo" };
    } catch (error) {
      log.error(
        "notificacion.email.error",
        { external_source: "resend", duracion_ms: Date.now() - inicio },
        error,
      );
      return {
        ok: false,
        error: error instanceof Error ? error.message : "error de correo",
      };
    }
  },
};
