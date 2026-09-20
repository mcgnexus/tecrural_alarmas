import { z } from "zod";
import { catalogoCultivos } from "@/lib/cultivos/catalogo";
import type { CulturaId } from "@/lib/cultivos/catalogo";

const idsCultivos = Object.keys(catalogoCultivos) as [CulturaId, ...CulturaId[]];

export const esquemaDispositivoId = z.string().trim().min(1).max(128);

export function dispositivoValido(valor: unknown): valor is string {
  return esquemaDispositivoId.safeParse(valor).success;
}

export const esquemaCuerpoParcela = z.object({
  dispositivoId: esquemaDispositivoId,
  nombre: z.string().trim().min(1).max(80),
  cultivo: z.enum(idsCultivos),
  latitud: z.number().gte(-90).lte(90),
  longitud: z.number().gte(-180).lte(180),
});

export type CuerpoParcela = z.infer<typeof esquemaCuerpoParcela>;

export function cuerpoParcelaValido(dato: unknown): dato is CuerpoParcela {
  return esquemaCuerpoParcela.safeParse(dato).success;
}

export const esquemaCuerpoRiesgo = z.object({
  latitud: z.number().gte(-90).lte(90),
  longitud: z.number().gte(-180).lte(180),
  cultivo: z.enum(idsCultivos),
  fenofaseId: z.string().optional(),
  aemetMunicipio: z.string().regex(/^\d{5}$/).optional(),
});

export type CuerpoRiesgo = z.infer<typeof esquemaCuerpoRiesgo>;

export function cuerpoRiesgoValido(dato: unknown): dato is CuerpoRiesgo {
  return esquemaCuerpoRiesgo.safeParse(dato).success;
}

export const CANALES_AVISO = [
  "telegram",
  "email",
  "whatsapp",
  "push",
  "log",
] as const;

export const SEVERIDADES_AVISO = [
  "info",
  "aviso",
  "alerta",
  "critica",
] as const;

export const esquemaSuscripcion = z.object({
  dispositivoId: esquemaDispositivoId,
  parcelaId: z.string().uuid().nullish(),
  canal: z.enum(CANALES_AVISO),
  destino: z.string().trim().min(1).max(2000),
  severidadMinima: z.enum(SEVERIDADES_AVISO).optional(),
});

export type CuerpoSuscripcion = z.infer<typeof esquemaSuscripcion>;

export function suscripcionValida(dato: unknown): dato is CuerpoSuscripcion {
  return esquemaSuscripcion.safeParse(dato).success;
}

export const EVENTOS_CRM = [
  "registro_rapido",
  "cuenta_completada",
  "explotacion_creada",
  "parcela_anadida",
  "avisos_activados",
  "diagnostico_usado",
  "riego_consultado",
  "consulta_meteorologia",
  "presupuesto_intent",
  "presupuesto_solicitado",
  "whatsapp_contact",
] as const;

export const INTERESES_CRM = [
  "SENSORS",
  "WEATHER_STATION",
  "AI_DIAGNOSIS",
  "IRRIGATION",
  "REPORTS",
] as const;

export const esquemaSenalCrm = z.object({
  dispositivoId: esquemaDispositivoId,
  evento: z.enum(EVENTOS_CRM),
  intereses: z.array(z.enum(INTERESES_CRM)).max(10).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  source: z.string().trim().max(64).optional(),
  cropType: z.string().trim().max(64).optional(),
  serviceKey: z.string().trim().max(64).optional(),
});

export type CuerpoSenalCrm = z.infer<typeof esquemaSenalCrm>;

export function senalCrmValida(dato: unknown): dato is CuerpoSenalCrm {
  return esquemaSenalCrm.safeParse(dato).success;
}

export const TIPOS_LEAD_EVENTO = [
  "APP_VISIT",
  "LOCATION_SELECTED",
  "PLOT_CREATED",
  "CROP_SELECTED",
  "ALERT_OPENED",
  "ALERTS_ENABLED",
  "WATER_VIEWED",
  "PHYTOSANITARY_VIEWED",
  "AI_DIAGNOSIS_STARTED",
  "SENSOR_CTA_VIEWED",
  "SENSOR_CTA_CLICKED",
  "IRRIGATION_CTA_CLICKED",
  "CONTACT_REQUESTED",
  "QUOTE_REQUESTED",
] as const;

export const esquemaLeadEvento = z.object({
  anonymousId: z.string().trim().min(1).max(128).optional(),
  userId: z.string().uuid().optional(),
  plotId: z.string().uuid().optional(),
  eventType: z.enum(TIPOS_LEAD_EVENTO),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CuerpoLeadEvento = z.infer<typeof esquemaLeadEvento>;

export function leadEventoValido(dato: unknown): dato is CuerpoLeadEvento {
  return esquemaLeadEvento.safeParse(dato).success;
}

export const esquemaUuid = z.string().uuid();

export function uuidValido(valor: unknown): valor is string {
  return esquemaUuid.safeParse(valor).success;
}

export const CANALES_NOTIFICACION = [
  "push",
  "email",
  "telegram",
  "whatsapp",
] as const;

export const esquemaPreferenciasNotificacion = z.object({
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  telegramEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  yellowEnabled: z.boolean().optional(),
  orangeEnabled: z.boolean().optional(),
  redEnabled: z.boolean().optional(),
  quietHoursStart: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .nullable()
    .optional(),
  quietHoursEnd: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .nullable()
    .optional(),
});

export type CuerpoPreferencias = z.infer<typeof esquemaPreferenciasNotificacion>;

export function preferenciasValidas(
  dato: unknown,
): dato is CuerpoPreferencias {
  return esquemaPreferenciasNotificacion.safeParse(dato).success;
}

export const esquemaNotificacion = z.object({
  userId: z.string().uuid(),
  riskEventId: z.string().uuid().optional(),
  channel: z.enum(CANALES_NOTIFICACION),
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(2000),
  dedupKey: z.string().trim().min(1).max(200),
  scheduledAt: z.string().datetime().optional(),
});

export type CuerpoNotificacion = z.infer<typeof esquemaNotificacion>;

export function notificacionValida(dato: unknown): dato is CuerpoNotificacion {
  return esquemaNotificacion.safeParse(dato).success;
}

export const esquemaReglaRiesgo = z.object({
  code: z.string().trim().min(1).max(80),
  riskType: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  cropId: z.string().uuid().nullable().optional(),
  phenologicalStateId: z.string().uuid().nullable().optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
  version: z.number().int().min(1).max(1000).optional(),
});

export type CuerpoReglaRiesgo = z.infer<typeof esquemaReglaRiesgo>;

export function reglaRiesgoValida(dato: unknown): dato is CuerpoReglaRiesgo {
  return esquemaReglaRiesgo.safeParse(dato).success;
}

export const esquemaReglaRiesgoParcial = esquemaReglaRiesgo.partial();

export type CuerpoReglaRiesgoParcial = z.infer<
  typeof esquemaReglaRiesgoParcial
>;

export function reglaRiesgoParcialValida(
  dato: unknown,
): dato is CuerpoReglaRiesgoParcial {
  return esquemaReglaRiesgoParcial.safeParse(dato).success;
}

export const esquemaKc = z.object({
  kc: z.number().finite().min(0).max(3).nullable().optional(),
  kcValidated: z.boolean().optional(),
});

export type CuerpoKc = z.infer<typeof esquemaKc>;

export function kcValido(dato: unknown): dato is CuerpoKc {
  return esquemaKc.safeParse(dato).success;
}
