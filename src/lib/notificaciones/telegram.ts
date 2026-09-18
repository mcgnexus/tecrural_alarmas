import { crearLogger } from "@/lib/log/logger";
import { formatearAviso } from "./mensaje";
import type { AvisoParcela, Notificador, ResultadoEnvio } from "./tipos";

const log = crearLogger("notificaciones.telegram");

const ENDPOINT = "https://api.telegram.org";

export const notificadorTelegram: Notificador = {
  canal: "telegram",
  configurado: () => Boolean(process.env.TELEGRAM_BOT_TOKEN),
  async enviar(destino: string, aviso: AvisoParcela): Promise<ResultadoEnvio> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN no configurado" };

    const inicio = Date.now();
    try {
      const respuesta = await fetch(`${ENDPOINT}/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: destino,
          text: formatearAviso(aviso),
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!respuesta.ok) {
        throw new Error(`Telegram HTTP ${respuesta.status}`);
      }
      log.info("notificacion.telegram.ok", {
        external_source: "telegram",
        duracion_ms: Date.now() - inicio,
      });
      return { ok: true, detalle: "enviado por Telegram" };
    } catch (error) {
      log.error(
        "notificacion.telegram.error",
        { external_source: "telegram", duracion_ms: Date.now() - inicio },
        error,
      );
      return {
        ok: false,
        error: error instanceof Error ? error.message : "error de Telegram",
      };
    }
  },
};
