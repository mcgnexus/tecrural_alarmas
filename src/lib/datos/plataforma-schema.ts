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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  marketingConsentAt: timestamp("marketing_consent_at", { withTimezone: true }),
  privacyVersion: text("privacy_version"),
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
  rawPayload: jsonb("raw_payload").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  reglasRiesgo,
  eventosRiesgo,
  eventosLead,
  configPuntosLead,
  puntuacionesLead,
  preferenciasNotificacion,
  notificacionesPlataforma,
};
