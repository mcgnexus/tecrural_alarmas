import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("notificaciones.aviso-negocio");

const ENDPOINT = "https://api.telegram.org";

export interface SolicitudContacto {
  nombre: string;
  telefono: string;
  mensaje?: string;
  servicioNombre?: string;
}

/**
 * Notifica al equipo (chat de Telegram del negocio) una solicitud de contacto
 * entrante. Degradación elegante: si no hay `TELEGRAM_BOT_TOKEN` o
 * `TELEGRAM_CHAT_ID_NEGOCIO`, se registra y se ignora — nunca rompe el flujo.
 */
export async function notificarSolicitudContacto(
  solicitud: SolicitudContacto,
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID_NEGOCIO?.trim();
  if (!token || !chatId) {
    log.warn("negocio.telegram.no_configurado", {
      data: { telegram: Boolean(token), chat: Boolean(chatId) },
    });
    return false;
  }

  const lineas = [
    "🌱 Nueva solicitud de información",
    `👤 ${solicitud.nombre}`,
    `📞 ${solicitud.telefono}`,
  ];
  if (solicitud.servicioNombre) lineas.push(`🛠 ${solicitud.servicioNombre}`);
  if (solicitud.mensaje) lineas.push(`💬 ${solicitud.mensaje}`);

  const inicio = Date.now();
  try {
    const respuesta = await fetch(`${ENDPOINT}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: lineas.join("\n"),
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!respuesta.ok) {
      throw new Error(`Telegram HTTP ${respuesta.status}`);
    }
    log.info("negocio.telegram.ok", {
      external_source: "telegram",
      duracion_ms: Date.now() - inicio,
    });
    return true;
  } catch (error) {
    log.warn("negocio.telegram.error", { external_source: "telegram" }, error);
    return false;
  }
}
