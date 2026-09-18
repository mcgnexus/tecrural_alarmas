import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Tablas del esquema `public` preexistente (CRM). Solo lectura/escritura de
 * filas: NO se define ni aplica DDL sobre `public`.
 */


export const leadsCrm = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  score: integer("score").notNull().default(0),
  status: text("status").notNull().default("NEW"),
  notes: text("notes"),
  lastEventAt: timestamp("last_event_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  visitorId: text("visitor_id"),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  municipalityId: uuid("municipality_id"),
  serviceKey: text("service_key"),
  cropType: text("crop_type"),
  areaHa: real("area_ha"),
  comment: text("comment"),
  source: text("source"),
  mergedIntoLeadId: uuid("merged_into_lead_id"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  referrer: text("referrer"),
  landingPath: text("landing_path"),
});

export const leadEvents = pgTable("lead_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id").notNull(),
  type: text("type").notNull(),
  weight: integer("weight").notNull().default(0),
  metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const leadInterests = pgTable("lead_interests", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id").notNull(),
  interest: text("interest").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const leadScoringConfig = pgTable("lead_scoring_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventKey: text("event_key").notNull(),
  weight: integer("weight").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const serviceOffers = pgTable("service_offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceKey: text("service_key").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  priceLabel: text("price_label").notNull(),
  priceNote: text("price_note"),
  ctaLabel: text("cta_label").notNull(),
  ctaHref: text("cta_href").notNull(),
  signal: text("signal"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  problem: text("problem").notNull().default(""),
  solution: text("solution").notNull().default(""),
  deliverables: jsonb("deliverables").$type<string[]>().notNull().default([]),
});
