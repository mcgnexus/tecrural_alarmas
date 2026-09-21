import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("notificaciones.aviso-negocio");

const ENDPOINT = "https://api.telegram.org";

export interface SolicitudContacto {
  nombre: string;
  telefono: string;
  mensaje?: string;
  servicioNombre?: string;
  /** Datos del asistente conversacional: cambian el formato del aviso. */
  origen?: "formulario" | "asistente";
  perfil?: "agricultura" | "ganaderia" | "mixta";
  municipio?: string;
  interesProbable?: string;
}

async function enviarTelegram(chatId: string, token: string, texto: string): Promise<boolean> {
  const inicio = Date.now();
  try {
    const respuesta = await fetch(`${ENDPOINT}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: texto,
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

/** Credenciales del chat de negocio, o null si falta alguna. */
function credencialesNegocio(): { token: string; chatId: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID_NEGOCIO?.trim();
  if (!token || !chatId) {
    log.warn("negocio.telegram.no_configurado", {
      data: { telegram: Boolean(token), chat: Boolean(chatId) },
    });
    return null;
  }
  return { token, chatId };
}

/**
 * Notifica al equipo (chat de Telegram del negocio) una solicitud de contacto
 * entrante. Con `origen: "asistente"` usa el resumen tipo lead del chat.
 * Degradación elegante: sin `TELEGRAM_BOT_TOKEN` o `TELEGRAM_CHAT_ID_NEGOCIO`
 * se registra y se ignora — nunca rompe el flujo.
 */
export async function notificarSolicitudContacto(
  solicitud: SolicitudContacto,
): Promise<boolean> {
  const credenciales = credencialesNegocio();
  if (!credenciales) return false;
  const { token, chatId } = credenciales;

  let lineas: string[];
  if (solicitud.origen === "asistente") {
    const perfilLegible =
      solicitud.perfil === "ganaderia"
        ? "Ganadero"
        : solicitud.perfil === "mixta"
          ? "Mixto (agri + gana)"
          : "Agricultor";
    lineas = [
      "🌱 Nuevo lead TecRural",
      `👤 ${perfilLegible}${solicitud.municipio ? ` · ${solicitud.municipio}` : ""}`,
      `⚠ Problema: ${solicitud.mensaje ?? "—"}`,
      `📞 Contacto: WhatsApp — ${solicitud.telefono} (${solicitud.nombre})`,
    ];
    if (solicitud.interesProbable) {
      lineas.push(`🎯 Interés probable: ${solicitud.interesProbable}`);
    }
    if (solicitud.servicioNombre) {
      lineas.push(`🛠 Servicio consultado: ${solicitud.servicioNombre}`);
    }
  } else {
    lineas = [
      "🌱 Nueva solicitud de información",
      `👤 ${solicitud.nombre}`,
      `📞 ${solicitud.telefono}`,
    ];
    if (solicitud.servicioNombre) lineas.push(`🛠 ${solicitud.servicioNombre}`);
    if (solicitud.mensaje) lineas.push(`💬 ${solicitud.mensaje}`);
  }

  return enviarTelegram(chatId, token, lineas.join("\n"));
}

export interface NuevoSuscriptor {
  canal: string;
  destino: string;
  severidadMinima: string;
  /** Nombre de la parcela, o null si el aviso aplica a todas. */
  parcelaNombre?: string | null;
  /** Origen de la suscripción para dar contexto al equipo. */
  origen?: string;
}

/**
 * Notifica al equipo (chat de Telegram del negocio) que alguien ha activado un
 * nuevo aviso/suscripción. Degradación elegante: sin credenciales se registra y
 * se ignora — nunca rompe el flujo de alta.
 */
export async function notificarNuevoSuscriptor(
  suscriptor: NuevoSuscriptor,
): Promise<boolean> {
  const credenciales = credencialesNegocio();
  if (!credenciales) return false;
  const { token, chatId } = credenciales;

  const lineas = [
    "🔔 Nuevo suscriptor de avisos",
    `📡 Canal: ${suscriptor.canal}`,
    `🎯 Gravedad mínima: ${suscriptor.severidadMinima}`,
    `📍 Parcela: ${suscriptor.parcelaNombre ?? "Todas las parcelas"}`,
    `📮 Destino: ${suscriptor.destino}`,
  ];
  if (suscriptor.origen) lineas.push(`🏷 Origen: ${suscriptor.origen}`);

  return enviarTelegram(chatId, token, lineas.join("\n"));
}
