export type NotificationChannel = "push" | "email" | "telegram" | "whatsapp";

export type NotificationStatus = "pending" | "sent" | "error" | "skipped";

export type NotificationLevel = "yellow" | "orange" | "red";

export interface NotificationPreference {
  id: string;
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  telegramEnabled: boolean;
  whatsappEnabled: boolean;
  yellowEnabled: boolean;
  orangeEnabled: boolean;
  redEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  riskEventId: string | null;
  channel: string;
  title: string;
  message: string;
  status: string;
  scheduledAt: string;
  sentAt: string | null;
  dedupKey: string;
  providerResponse: Record<string, unknown> | null;
}

const CLAVE_CANAL: Record<
  NotificationChannel,
  "pushEnabled" | "emailEnabled" | "telegramEnabled" | "whatsappEnabled"
> = {
  push: "pushEnabled",
  email: "emailEnabled",
  telegram: "telegramEnabled",
  whatsapp: "whatsappEnabled",
};

const CLAVE_NIVEL: Record<
  NotificationLevel,
  "yellowEnabled" | "orangeEnabled" | "redEnabled"
> = {
  yellow: "yellowEnabled",
  orange: "orangeEnabled",
  red: "redEnabled",
};

export function canalHabilitado(
  prefs: NotificationPreference,
  channel: NotificationChannel,
): boolean {
  return prefs[CLAVE_CANAL[channel]];
}

export function nivelHabilitado(
  prefs: NotificationPreference,
  level: NotificationLevel,
): boolean {
  return prefs[CLAVE_NIVEL[level]];
}

/** ¿Las preferencias permiten notificar por ese canal y nivel? */
export function puedeNotificar(
  prefs: NotificationPreference,
  channel: NotificationChannel,
  level: NotificationLevel,
): boolean {
  return canalHabilitado(prefs, channel) && nivelHabilitado(prefs, level);
}

function minutos(hora: string): number {
  const [h, m] = hora.split(":");
  return Number(h) * 60 + Number(m ?? 0);
}

/** ¿El instante cae dentro de la franja de silencio (soporta cruce de medianoche)? */
export function dentroDeHorasSilencio(
  prefs: NotificationPreference,
  momento: Date = new Date(),
): boolean {
  if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return false;
  const ahora = momento.getHours() * 60 + momento.getMinutes();
  const inicio = minutos(prefs.quietHoursStart);
  const fin = minutos(prefs.quietHoursEnd);
  if (inicio === fin) return false;
  if (inicio < fin) return ahora >= inicio && ahora < fin;
  return ahora >= inicio || ahora < fin;
}
