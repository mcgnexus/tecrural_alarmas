import * as webpush from "web-push";
import type { PushSubscription } from "web-push";
import { crearLogger } from "@/lib/log/logger";
import { asuntoAviso, formatearAviso } from "./mensaje";
import type { AvisoParcela, Notificador, ResultadoEnvio } from "./tipos";

const log = crearLogger("notificaciones.push");

function configurado(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
}

export const notificadorPush: Notificador = {
  canal: "push",
  configurado,
  async enviar(destino: string, aviso: AvisoParcela): Promise<ResultadoEnvio> {
    const publica = process.env.VAPID_PUBLIC_KEY;
    const privada = process.env.VAPID_PRIVATE_KEY;
    if (!publica || !privada) {
      return { ok: false, error: "claves VAPID no configuradas" };
    }

    let suscripcion: PushSubscription;
    try {
      suscripcion = JSON.parse(destino) as PushSubscription;
    } catch {
      return { ok: false, error: "suscripción push no válida" };
    }

    try {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT ?? "mailto:soporte@tecrural.local",
        publica,
        privada,
      );
      await webpush.sendNotification(
        suscripcion,
        JSON.stringify({
          title: asuntoAviso(aviso),
          body: formatearAviso(aviso),
          url: "/alertas",
        }),
      );
      log.info("notificacion.push.ok", { external_source: "push" });
      return { ok: true, detalle: "enviado por push" };
    } catch (error) {
      log.error("notificacion.push.error", { external_source: "push" }, error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : "error de push",
      };
    }
  },
};
