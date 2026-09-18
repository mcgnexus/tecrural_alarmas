import type { Canal, Notificador } from "./tipos";
import { notificadorLog } from "./log";
import { notificadorTelegram } from "./telegram";
import { notificadorEmail } from "./email";
import { notificadorWhatsapp } from "./whatsapp";
import { notificadorPush } from "./push";

const registro: Record<Canal, Notificador> = {
  log: notificadorLog,
  telegram: notificadorTelegram,
  email: notificadorEmail,
  whatsapp: notificadorWhatsapp,
  push: notificadorPush,
};

export function obtenerNotificador(canal: Canal): Notificador {
  return registro[canal];
}

export function canalesConfigurados(): Canal[] {
  return (Object.keys(registro) as Canal[]).filter((canal) =>
    registro[canal].configurado(),
  );
}

export * from "./tipos";
