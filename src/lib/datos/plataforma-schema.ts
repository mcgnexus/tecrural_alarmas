import {
  bigserial,
  boolean,
  doublePrecision,
  integer,
  jsonb,
  numeric,
  pgSchema,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Esquema `plataforma` (modelo de usuarios/explotaciones/parcelas/cultivos/
 * estados fenológicos). Independiente de `public` y de `campo`.
 */
export const plataforma = pgSchema("plataforma");

export const usuarios = plataforma.table("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email"),
  phone: text("phone"),
  name: text("name"),
  authProvider: text("auth_provider").notNull().default("anon"),
  subscriptionPlan: text("subscription_plan").notNull().default("free"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  marketingConsentAt: timestamp("marketing_consent_at", { withTimezone: true }),
  privacyVersion: text("privacy_version"),
  consentVersion: text("consent_version"),
  consentTimestamp: timestamp("consent_timestamp", { withTimezone: true }),
});

export const explotaciones = plataforma.table("farms", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  municipality: text("municipality"),
  province: text("province"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const cultivos = plataforma.table("crops", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  nameEs: text("name_es").notNull(),
  category: text("category"),
  active: boolean("active").notNull().default(true),
  defaultHeatThresholdC: doublePrecision("default_heat_threshold_c"),
  defaultColdThresholdC: doublePrecision("default_cold_threshold_c"),
  kc: doublePrecision("kc"),
  kcValidated: boolean("kc_validated").notNull().default(false),
});

export const estadosFenologicos = plataforma.table("phenological_states", {
  id: uuid("id").primaryKey().defaultRandom(),
  cropId: uuid("crop_id").notNull(),
  slug: text("slug").notNull(),
  nameEs: text("name_es").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  coldSensitivity: numeric("cold_sensitivity"),
  heatSensitivity: numeric("heat_sensitivity"),
  waterSensitivity: numeric("water_sensitivity"),
  kc: numeric("kc"),
  kcValidated: boolean("kc_validated").notNull().default(false),
  active: boolean("active").notNull().default(true),
});

export const parcelasPlataforma = plataforma.table("plots", {
  id: uuid("id").primaryKey().defaultRandom(),
  farmId: uuid("farm_id").notNull(),
  name: text("name").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  elevationM: doublePrecision("elevation_m"),
  areaHa: doublePrecision("area_ha"),
  cropId: uuid("crop_id").notNull(),
  phenologicalStateId: uuid("phenological_state_id"),
  irrigated: boolean("irrigated"),
  irrigationType: text("irrigation_type"),
  soilType: text("soil_type"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ubicacionesClima = plataforma.table("weather_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  gridKey: text("grid_key").notNull().unique(),
  elevationM: doublePrecision("elevation_m"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const climaHorario = plataforma.table("weather_hourly", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  weatherLocationId: uuid("weather_location_id").notNull(),
  provider: text("provider").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  temperatureC: doublePrecision("temperature_c"),
  apparentTemperatureC: doublePrecision("apparent_temperature_c"),
  relativeHumidityPct: doublePrecision("relative_humidity_pct"),
  dewPointC: doublePrecision("dew_point_c"),
  precipitationMm: doublePrecision("precipitation_mm"),
  precipitationProbabilityPct: doublePrecision("precipitation_probability_pct"),
  windSpeedKmh: doublePrecision("wind_speed_kmh"),
  windGustKmh: doublePrecision("wind_gust_kmh"),
  windDirectionDeg: doublePrecision("wind_direction_deg"),
  cloudCoverPct: doublePrecision("cloud_cover_pct"),
  solarRadiationWm2: doublePrecision("solar_radiation_wm2"),
  et0Mm: doublePrecision("et0_mm"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const avisosOficiales = plataforma.table("official_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull(),
  externalId: text("external_id").notNull(),
  phenomenon: text("phenomenon").notNull(),
  severity: text("severity").notNull(),
  areaCode: text("area_code"),
  areaName: text("area_name"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  headline: text("headline").notNull(),
  description: text("description"),
  sourceUrl: text("source_url"),
  rawPayload: jsonb("raw_payload")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const alertasFitosanitarias = plataforma.table("phytosanitary_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull(),
  externalId: text("external_id"),
  cropId: uuid("crop_id"),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  province: text("province"),
  municipality: text("municipality"),
  severity: text("severity"),
  publishedAt: timestamp("published_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  sourceUrl: text("source_url"),
  sourceArticleUrl: text("source_article_url"),
  sourcePdfUrl: text("source_pdf_url"),
  sourceDocumentId: text("source_document_id"),
  sourceHash: text("source_hash"),
  sourcePage: integer("source_page"),
  sourcePublishedAt: timestamp("source_published_at", { withTimezone: true }),
  coverage: text("coverage"),
  region: text("region"),
  pestOrDisease: text("pest_or_disease"),
  recommendation: text("recommendation"),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validTo: timestamp("valid_to", { withTimezone: true }),
  extractionVersion: text("extraction_version"),
  extractionStatus: text("extraction_status").notNull().default("article"),
  extractionConfidence: doublePrecision("extraction_confidence"),
  evidenceText: text("evidence_text"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  rawPayload: jsonb("raw_payload").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Versiones de documentos RAIF detectados desde el RSS. */
export const raifDocuments = plataforma.table("raif_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull(),
  rssGuid: text("rss_guid").notNull(),
  documentKey: text("document_key").notNull().unique(),
  articleUrl: text("article_url").notNull(),
  pdfUrl: text("pdf_url"),
  pdfHash: text("pdf_hash"),
  version: integer("version").notNull().default(1),
  previousDocumentId: uuid("previous_document_id"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export const raifIngestions = plataforma.table("raif_ingestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  status: text("status").notNull(),
  fetched: integer("fetched").notNull().default(0),
  processed: integer("processed").notNull().default(0),
  saved: integer("saved").notNull().default(0),
  skipped: integer("skipped").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  errorSummary: text("error_summary"),
});

export const reglasRiesgo = plataforma.table("risk_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  riskType: text("risk_type").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  cropId: uuid("crop_id"),
  phenologicalStateId: uuid("phenological_state_id"),
  parameters: jsonb("parameters")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  enabled: boolean("enabled").notNull().default(true),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Copia inmutable de una regla antes de cualquier actualización o borrado. */
export const historialReglasRiesgo = plataforma.table("risk_rule_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  ruleId: uuid("rule_id").notNull(),
  action: text("action").notNull(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eventosRiesgo = plataforma.table("risk_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  plotId: uuid("plot_id").notNull(),
  riskType: text("risk_type").notNull(),
  level: text("level").notNull(),
  score: numeric("score"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  headline: text("headline").notNull(),
  summary: text("summary").notNull(),
  reason: jsonb("reason").$type<Record<string, unknown>>().notNull().default({}),
  ruleVersion: integer("rule_version").notNull().default(1),
  weatherLocationId: uuid("weather_location_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  status: text("status").notNull().default("open"),
});

export const eventosLead = plataforma.table("lead_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  anonymousId: text("anonymous_id"),
  plotId: uuid("plot_id"),
  eventType: text("event_type").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  points: integer("points").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const configPuntosLead = plataforma.table("lead_scoring_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventType: text("event_type").notNull().unique(),
  points: integer("points").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const puntuacionesLead = plataforma.table("lead_scores", {
  userId: uuid("user_id").primaryKey(),
  score: integer("score").notNull().default(0),
  classification: text("classification").notNull().default("usuario"),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const preferenciasNotificacion = plataforma.table(
  "notification_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().unique(),
    pushEnabled: boolean("push_enabled").notNull().default(false),
    emailEnabled: boolean("email_enabled").notNull().default(false),
    telegramEnabled: boolean("telegram_enabled").notNull().default(false),
    whatsappEnabled: boolean("whatsapp_enabled").notNull().default(false),
    yellowEnabled: boolean("yellow_enabled").notNull().default(false),
    orangeEnabled: boolean("orange_enabled").notNull().default(true),
    redEnabled: boolean("red_enabled").notNull().default(true),
    quietHoursStart: time("quiet_hours_start"),
    quietHoursEnd: time("quiet_hours_end"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const notificacionesPlataforma = plataforma.table("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  riskEventId: uuid("risk_event_id"),
  channel: text("channel").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  dedupKey: text("dedup_key").notNull(),
  providerResponse: jsonb("provider_response").$type<Record<
    string,
    unknown
  > | null>(),
});

export const solicitudesContacto = plataforma.table(
  "commercial_contact_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    plotId: uuid("plot_id").references(() => parcelasPlataforma.id, {
      onDelete: "set null",
    }),
    service: text("service").notNull(),
    preferredChannel: text("preferred_channel").notNull(),
    message: text("message"),
    anonymousId: text("anonymous_id"),
    userId: uuid("user_id").references(() => usuarios.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const sensores = plataforma.table("sensors", {
  id: uuid("id").primaryKey().defaultRandom(),
  plotId: uuid("plot_id")
    .notNull()
    .references(() => parcelasPlataforma.id, { onDelete: "cascade" }),
  deviceId: text("device_id").notNull().unique(),
  sensorType: text("sensor_type").notNull(),
  model: text("model"),
  installedAt: timestamp("installed_at", { withTimezone: true }),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lecturasSensores = plataforma.table("sensor_readings", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  sensorId: uuid("sensor_id")
    .notNull()
    .references(() => sensores.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  soilMoisturePct: doublePrecision("soil_moisture_pct"),
  airTemperatureC: doublePrecision("air_temperature_c"),
  relativeHumidityPct: doublePrecision("relative_humidity_pct"),
  soilTemperatureC: doublePrecision("soil_temperature_c"),
  batteryVoltage: doublePrecision("battery_voltage"),
  rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull().default({}),
});

/**
 * Tokens de un solo uso para dar acceso a una cuenta (invitaciones creadas por
 * el equipo). Solo se guarda el hash; nunca el token en claro.
 */
export const tokensUsuario = plataforma.table("auth_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usuarios.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  tipo: text("tipo").notNull().default("invite"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sesionesAdmin = plataforma.table("admin_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});

export const esquemaPlataforma = {
  plataforma,
  usuarios,
  explotaciones,
  cultivos,
  estadosFenologicos,
  parcelasPlataforma,
  ubicacionesClima,
  climaHorario,
  avisosOficiales,
  alertasFitosanitarias,
  raifDocuments,
  raifIngestions,
  reglasRiesgo,
  historialReglasRiesgo,
  eventosRiesgo,
  eventosLead,
  configPuntosLead,
  puntuacionesLead,
  preferenciasNotificacion,
  notificacionesPlataforma,
  solicitudesContacto,
  sensores,
  lecturasSensores,
  tokensUsuario,
  sesionesAdmin,
};
