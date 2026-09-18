import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type {
  Alerta,
  Canal,
  DemandaHidrica,
  EstadoNotificacion,
  FuenteDatos,
} from "@/lib/dominio/tipos";

export const campo = pgSchema("campo");

export const parcelas = campo.table(
  "parcelas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dispositivoId: text("dispositivo_id").notNull(),
    nombre: text("nombre").notNull(),
    cultivoSlug: text("cultivo_slug").notNull(),
    latitud: doublePrecision("latitud").notNull(),
    longitud: doublePrecision("longitud").notNull(),
    creadaEn: timestamp("creada_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("parcelas_dispositivo_idx").on(t.dispositivoId),
    check(
      "parcelas_coords_ok",
      sql`${t.latitud} BETWEEN -90 AND 90 AND ${t.longitud} BETWEEN -180 AND 180`,
    ),
  ],
);

export const evaluaciones = campo.table(
  "evaluaciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parcelaId: uuid("parcela_id")
      .notNull()
      .references(() => parcelas.id, { onDelete: "cascade" }),
    evaluadaEn: timestamp("evaluada_en", { withTimezone: true }).notNull().defaultNow(),
    fenofase: text("fenofase"),
    fuenteDatos: jsonb("fuente_datos").$type<FuenteDatos>().notNull(),
    demandaHidrica: jsonb("demanda_hidrica").$type<DemandaHidrica | null>(),
  },
  (t) => [index("evaluaciones_parcela_idx").on(t.parcelaId, t.evaluadaEn.desc())],
);

export const alertas = campo.table(
  "alertas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    evaluacionId: uuid("evaluacion_id")
      .notNull()
      .references(() => evaluaciones.id, { onDelete: "cascade" }),
    tipo: text("tipo").$type<Alerta["tipo"]>().notNull(),
    titulo: text("titulo").notNull(),
    mensaje: text("mensaje").notNull(),
    severidad: text("severidad").$type<Alerta["severidad"]>().notNull(),
    regla: text("regla").notNull(),
    fenofase: text("fenofase"),
    datosUtilizados: jsonb("datos_utilizados")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    fuente: jsonb("fuente").$type<FuenteDatos>().notNull(),
    vigenciaHasta: date("vigencia_hasta", { mode: "string" }),
    creadaEn: timestamp("creada_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("alertas_evaluacion_idx").on(t.evaluacionId),
    check("alertas_severidad_ok", sql`${t.severidad} IN ('info', 'aviso', 'alerta', 'critica')`),
    check(
      "alertas_tipo_ok",
      sql`${t.tipo} IN ('helada', 'golpe-de-calor', 'viento', 'demanda-hidrica')`,
    ),
  ],
);

export const suscripcionesAviso = campo.table(
  "suscripciones_aviso",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dispositivoId: text("dispositivo_id").notNull(),
    parcelaId: uuid("parcela_id").references(() => parcelas.id, {
      onDelete: "cascade",
    }),
    canal: text("canal").$type<Canal>().notNull(),
    destino: text("destino").notNull(),
    severidadMinima: text("severidad_minima")
      .$type<Alerta["severidad"]>()
      .notNull()
      .default("aviso"),
    activa: boolean("activa").notNull().default(true),
    creadaEn: timestamp("creada_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
    verificadaEn: timestamp("verificada_en", { withTimezone: true }),
  },
  (t) => [
    index("suscripciones_dispositivo_idx").on(t.dispositivoId, t.activa),
  ],
);

export const notificaciones = campo.table(
  "notificaciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    suscripcionId: uuid("suscripcion_id")
      .notNull()
      .references(() => suscripcionesAviso.id, { onDelete: "cascade" }),
    alertaId: uuid("alerta_id").references(() => alertas.id, {
      onDelete: "set null",
    }),
    parcelaId: uuid("parcela_id")
      .notNull()
      .references(() => parcelas.id, { onDelete: "cascade" }),
    canal: text("canal").$type<Canal>().notNull(),
    clave: text("clave").notNull(),
    estado: text("estado").$type<EstadoNotificacion>().notNull().default("pendiente"),
    intentos: integer("intentos").notNull().default(0),
    ultimoIntentoEn: timestamp("ultimo_intento_en", { withTimezone: true }),
    enviadaEn: timestamp("enviada_en", { withTimezone: true }),
    error: text("error"),
    creadaEn: timestamp("creada_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("notificaciones_dedup_idx").on(
      t.parcelaId,
      t.canal,
      t.clave,
      t.enviadaEn.desc(),
    ),
    index("notificaciones_suscripcion_idx").on(t.suscripcionId, t.creadaEn.desc()),
  ],
);

export const schema = {
  campo,
  parcelas,
  evaluaciones,
  alertas,
  suscripcionesAviso,
  notificaciones,
};