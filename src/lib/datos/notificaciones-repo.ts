import { and, desc, eq, sql } from "drizzle-orm";
import { obtenerDb } from "./db";
import {
  notificacionesPlataforma,
  preferenciasNotificacion,
} from "./plataforma-schema";
import type {
  Notification,
  NotificationPreference,
} from "@/lib/dominio/notificaciones";

type FilaPref = typeof preferenciasNotificacion.$inferSelect;
type FilaNotif = typeof notificacionesPlataforma.$inferSelect;

function aPreferencia(fila: FilaPref): NotificationPreference {
  return {
    id: fila.id,
    userId: fila.userId,
    pushEnabled: fila.pushEnabled,
    emailEnabled: fila.emailEnabled,
    telegramEnabled: fila.telegramEnabled,
    whatsappEnabled: fila.whatsappEnabled,
    yellowEnabled: fila.yellowEnabled,
    orangeEnabled: fila.orangeEnabled,
    redEnabled: fila.redEnabled,
    quietHoursStart: fila.quietHoursStart,
    quietHoursEnd: fila.quietHoursEnd,
    createdAt: fila.createdAt.toISOString(),
    updatedAt: fila.updatedAt.toISOString(),
  };
}

function aNotificacion(fila: FilaNotif): Notification {
  return {
    id: fila.id,
    userId: fila.userId,
    riskEventId: fila.riskEventId,
    channel: fila.channel,
    title: fila.title,
    message: fila.message,
    status: fila.status,
    scheduledAt: fila.scheduledAt.toISOString(),
    sentAt: fila.sentAt ? fila.sentAt.toISOString() : null,
    dedupKey: fila.dedupKey,
    providerResponse: fila.providerResponse,
  };
}

export async function obtenerPreferencias(
  userId: string,
): Promise<NotificationPreference | null> {
  const db = obtenerDb();
  const [fila] = await db
    .select()
    .from(preferenciasNotificacion)
    .where(eq(preferenciasNotificacion.userId, userId))
    .limit(1);
  return fila ? aPreferencia(fila) : null;
}

export async function guardarPreferencias(
  userId: string,
  cambios: Partial<
    Pick<
      NotificationPreference,
      | "pushEnabled"
      | "emailEnabled"
      | "telegramEnabled"
      | "whatsappEnabled"
      | "yellowEnabled"
      | "orangeEnabled"
      | "redEnabled"
      | "quietHoursStart"
      | "quietHoursEnd"
    >
  >,
): Promise<NotificationPreference> {
  const db = obtenerDb();
  const actual = await obtenerPreferencias(userId);
  const base = actual ?? {
    pushEnabled: false,
    emailEnabled: false,
    telegramEnabled: false,
    whatsappEnabled: false,
    yellowEnabled: false,
    orangeEnabled: true,
    redEnabled: true,
    quietHoursStart: null,
    quietHoursEnd: null,
  };
  const fusion = { ...base, ...cambios };

  await db
    .insert(preferenciasNotificacion)
    .values({
      userId,
      pushEnabled: fusion.pushEnabled,
      emailEnabled: fusion.emailEnabled,
      telegramEnabled: fusion.telegramEnabled,
      whatsappEnabled: fusion.whatsappEnabled,
      yellowEnabled: fusion.yellowEnabled,
      orangeEnabled: fusion.orangeEnabled,
      redEnabled: fusion.redEnabled,
      quietHoursStart: fusion.quietHoursStart,
      quietHoursEnd: fusion.quietHoursEnd,
    })
    .onConflictDoUpdate({
      target: preferenciasNotificacion.userId,
      set: {
        pushEnabled: sql`excluded.push_enabled`,
        emailEnabled: sql`excluded.email_enabled`,
        telegramEnabled: sql`excluded.telegram_enabled`,
        whatsappEnabled: sql`excluded.whatsapp_enabled`,
        yellowEnabled: sql`excluded.yellow_enabled`,
        orangeEnabled: sql`excluded.orange_enabled`,
        redEnabled: sql`excluded.red_enabled`,
        quietHoursStart: sql`excluded.quiet_hours_start`,
        quietHoursEnd: sql`excluded.quiet_hours_end`,
        updatedAt: sql`now()`,
      },
    });

  const guardado = await obtenerPreferencias(userId);
  if (!guardado) throw new Error("No se pudieron guardar las preferencias.");
  return guardado;
}

/** Registra/actualiza una notificación (idempotente por dedup_key+canal+usuario). */
export async function registrarNotificacion(input: {
  userId: string;
  riskEventId?: string | null;
  channel: string;
  title: string;
  message: string;
  dedupKey: string;
  scheduledAt?: Date;
  status?: string;
}): Promise<void> {
  const db = obtenerDb();
  await db
    .insert(notificacionesPlataforma)
    .values({
      userId: input.userId,
      riskEventId: input.riskEventId ?? null,
      channel: input.channel,
      title: input.title,
      message: input.message,
      status: input.status ?? "pending",
      scheduledAt: input.scheduledAt ?? new Date(),
      dedupKey: input.dedupKey,
    })
    .onConflictDoUpdate({
      target: [
        notificacionesPlataforma.dedupKey,
        notificacionesPlataforma.channel,
        notificacionesPlataforma.userId,
      ],
      set: {
        title: sql`excluded.title`,
        message: sql`excluded.message`,
        scheduledAt: sql`excluded.scheduled_at`,
        status: sql`excluded.status`,
      },
    });
}

export async function listarNotificaciones(
  filtros: { userId?: string; status?: string; limite?: number } = {},
): Promise<Notification[]> {
  const db = obtenerDb();
  const condiciones = [];
  if (filtros.userId) {
    condiciones.push(eq(notificacionesPlataforma.userId, filtros.userId));
  }
  if (filtros.status) {
    condiciones.push(eq(notificacionesPlataforma.status, filtros.status));
  }
  const filas = await db
    .select()
    .from(notificacionesPlataforma)
    .where(condiciones.length > 0 ? and(...condiciones) : undefined)
    .orderBy(desc(notificacionesPlataforma.scheduledAt))
    .limit(filtros.limite ?? 100);
  return filas.map(aNotificacion);
}

export async function marcarNotificacionEnviada(
  id: string,
  providerResponse?: Record<string, unknown>,
): Promise<void> {
  const db = obtenerDb();
  await db
    .update(notificacionesPlataforma)
    .set({
      status: "sent",
      sentAt: new Date(),
      providerResponse: providerResponse ?? null,
    })
    .where(eq(notificacionesPlataforma.id, id));
}
