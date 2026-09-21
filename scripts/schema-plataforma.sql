-- Esquema aislado `plataforma` (modelo de usuarios, explotaciones, parcelas,
-- cultivos y estados fenológicos). NO toca `public` ni `campo`.

CREATE SCHEMA IF NOT EXISTS plataforma;

CREATE TABLE IF NOT EXISTS plataforma.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  phone text,
  name text,
  auth_provider text NOT NULL DEFAULT 'anon',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  marketing_consent boolean NOT NULL DEFAULT false,
  marketing_consent_at timestamptz,
  privacy_version text,
  consent_version text,
  consent_timestamp timestamptz
);

-- RGPD: consentimiento explícito separado (no auto-equivalencia alerta=publicidad)
ALTER TABLE plataforma.users ADD COLUMN IF NOT EXISTS consent_version text;
ALTER TABLE plataforma.users ADD COLUMN IF NOT EXISTS consent_timestamp timestamptz;

-- Sesiones de administración: solo se guarda el hash del token (nunca el token ni el secreto).
CREATE TABLE IF NOT EXISTS plataforma.admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_used_at timestamptz
);
CREATE INDEX IF NOT EXISTS admin_sessions_expira_idx ON plataforma.admin_sessions (expires_at);

-- Tokens de un solo uso para dar acceso a una cuenta (solo el hash).
CREATE TABLE IF NOT EXISTS plataforma.auth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES plataforma.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  tipo text NOT NULL DEFAULT 'invite',
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_tokens_usuario_idx ON plataforma.auth_tokens (user_id);

CREATE TABLE IF NOT EXISTS plataforma.farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES plataforma.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  municipality text,
  province text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plataforma.crops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_es text NOT NULL,
  category text,
  active boolean NOT NULL DEFAULT true,
  default_heat_threshold_c double precision,
  default_cold_threshold_c double precision
);

-- Sensibilidades configurables por cultivo y estado fenológico.
CREATE TABLE IF NOT EXISTS plataforma.phenological_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id uuid NOT NULL REFERENCES plataforma.crops(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name_es text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  cold_sensitivity numeric,
  heat_sensitivity numeric,
  water_sensitivity numeric,
  active boolean NOT NULL DEFAULT true,
  UNIQUE (crop_id, slug)
);

CREATE TABLE IF NOT EXISTS plataforma.plots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES plataforma.farms(id) ON DELETE CASCADE,
  name text NOT NULL,
  latitude double precision,
  longitude double precision,
  elevation_m double precision,
  area_ha double precision,
  crop_id uuid NOT NULL REFERENCES plataforma.crops(id),
  phenological_state_id uuid REFERENCES plataforma.phenological_states(id) ON DELETE SET NULL,
  irrigated boolean,
  irrigation_type text,
  soil_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plots_coords_ok CHECK (
    (latitude IS NULL OR latitude BETWEEN -90 AND 90) AND
    (longitude IS NULL OR longitude BETWEEN -180 AND 180)
  )
);

CREATE INDEX IF NOT EXISTS farms_user_idx ON plataforma.farms (user_id);
CREATE INDEX IF NOT EXISTS plots_farm_idx ON plataforma.plots (farm_id);
CREATE INDEX IF NOT EXISTS plots_crop_idx ON plataforma.plots (crop_id);
CREATE INDEX IF NOT EXISTS plots_coords_idx ON plataforma.plots (latitude, longitude);
CREATE INDEX IF NOT EXISTS phenological_crop_idx
  ON plataforma.phenological_states (crop_id);

INSERT INTO plataforma.crops (slug, name_es, category)
VALUES
  ('almond', 'Almendro', 'frutal'),
  ('olive', 'Olivo', 'frutal'),
  ('pistachio', 'Pistacho', 'frutal'),
  ('cereal', 'Cereal', 'cereal'),
  ('avocado', 'Aguacate', 'tropical'),
  ('mango', 'Mango', 'tropical'),
  ('custard_apple', 'Chirimoya', 'tropical')
ON CONFLICT (slug) DO NOTHING;

-- Puntos meteorológicos reutilizables (rejilla 0.02°). No una previsión por
-- parcela: todas las parcelas cercanas comparten la misma predicción.
CREATE TABLE IF NOT EXISTS plataforma.weather_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  grid_key text NOT NULL UNIQUE,
  elevation_m double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plataforma.weather_hourly (
  id bigserial PRIMARY KEY,
  weather_location_id uuid NOT NULL REFERENCES plataforma.weather_locations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  timestamp timestamptz NOT NULL,
  temperature_c double precision,
  apparent_temperature_c double precision,
  relative_humidity_pct double precision,
  dew_point_c double precision,
  precipitation_mm double precision,
  precipitation_probability_pct double precision,
  wind_speed_kmh double precision,
  wind_gust_kmh double precision,
  wind_direction_deg double precision,
  cloud_cover_pct double precision,
  solar_radiation_wm2 double precision,
  et0_mm double precision,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (weather_location_id, provider, timestamp)
);

CREATE INDEX IF NOT EXISTS weather_hourly_consulta_idx
  ON plataforma.weather_hourly (weather_location_id, provider, timestamp DESC);

-- Avisos oficiales (AEMET, RAIF…) normalizados y auditables.
CREATE TABLE IF NOT EXISTS plataforma.official_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  external_id text NOT NULL,
  phenomenon text NOT NULL,
  severity text NOT NULL,
  area_code text,
  area_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  headline text NOT NULL,
  description text,
  source_url text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);

CREATE INDEX IF NOT EXISTS official_alerts_vigencia_idx
  ON plataforma.official_alerts (starts_at, ends_at);

-- Avisos fitosanitarios (RAIF u otras fuentes), por cultivo y zona.
CREATE TABLE IF NOT EXISTS plataforma.phytosanitary_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  external_id text,
  crop_id uuid REFERENCES plataforma.crops(id) ON DELETE SET NULL,
  title text NOT NULL,
  summary text NOT NULL,
  province text,
  municipality text,
  severity text,
  published_at timestamptz NOT NULL DEFAULT now(),
  source_url text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);

CREATE INDEX IF NOT EXISTS phyto_crop_idx
  ON plataforma.phytosanitary_alerts (crop_id);
CREATE INDEX IF NOT EXISTS phyto_pub_idx
  ON plataforma.phytosanitary_alerts (published_at DESC);

-- Reglas de riesgo configurables (no codificadas por completo en TypeScript).
CREATE TABLE IF NOT EXISTS plataforma.risk_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  risk_type text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  crop_id uuid REFERENCES plataforma.crops(id) ON DELETE CASCADE,
  phenological_state_id uuid REFERENCES plataforma.phenological_states(id) ON DELETE CASCADE,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS risk_rules_lookup_idx
  ON plataforma.risk_rules (risk_type, enabled);
CREATE INDEX IF NOT EXISTS risk_rules_crop_idx
  ON plataforma.risk_rules (crop_id);

INSERT INTO plataforma.risk_rules (code, risk_type, name, description, parameters, enabled)
VALUES
  ('helada', 'helada', 'Riesgo de helada',
   'Compara la temperatura mínima prevista con los umbrales configurados.',
   '{"temperature":{"yellow":3,"orange":1,"red":-1},"radiative_modifier":{"maxWindKmh":10,"maxCloudCoverPct":25}}'::jsonb,
   true),
  ('golpe-de-calor', 'golpe-de-calor', 'Golpe de calor',
   'Compara la máxima prevista con los umbrales configurados y su duración.',
   '{"temperature":{"yellow":32,"orange":35,"red":39},"duration":{"heatThreshold":35,"prolongedHours":4,"scoreBonus":10},"sensitivity":{"crop":1,"phenology":1}}'::jsonb,
   true),
  ('viento', 'viento', 'Viento fuerte',
   'Evalúa viento medio, racha máxima y duración; avisa de labores poco favorables.',
   '{"gustKmh":{"yellow":30,"orange":50,"red":70},"labor":{"thresholdKmh":30,"minHours":1}}'::jsonb,
   true),
  ('lluvia', 'lluvia', 'Lluvia intensa',
   'Suma precipitación por ventanas; da prioridad a los avisos oficiales.',
   '{"thresholds":{"rain1h":{"yellow":5,"orange":15,"red":30},"rain3h":{"yellow":8,"orange":20,"red":40},"rain6h":{"yellow":10,"orange":25,"red":50},"rain24h":{"yellow":20,"orange":40,"red":80}}}'::jsonb,
   true),
  ('tormenta', 'tormenta', 'Tormenta',
   'Combina rachas, probabilidad de precipitación e intensidad (conservador).',
   '{"gust":{"yellow":50,"orange":70,"red":90},"precipitationProbability":{"yellow":50,"orange":70,"red":85},"rainIntensity":{"yellow":5,"orange":15,"red":30}}'::jsonb,
   true),
  ('demanda-hidrica', 'demanda-hidrica', 'Demanda hídrica orientativa',
   'Índice ET0_7d − lluvia efectiva; sin sensor no afirma estrés ni recomienda riego.',
   '{"scoreLevels":{"yellow":20,"orange":40,"red":70},"effectiveRainFactor":0.8,"forecastModifier":{"heatThresholdC":32,"modifier":10}}'::jsonb,
   true),
  ('riesgo-fungico', 'riesgo-fungico', 'Riesgo fúngico agroclimático',
   'Condiciones meteorológicas que pueden favorecer enfermedades fúngicas (orientativo).',
   '{"humidity":{"yellow":80,"orange":90},"temperature":{"minC":8,"maxC":28}}'::jsonb,
   true)
ON CONFLICT (code) DO NOTHING;

-- Configura los umbrales de helada si aún no se han ajustado (no pisa cambios manuales).
UPDATE plataforma.risk_rules
SET parameters = '{"temperature":{"yellow":3,"orange":1,"red":-1},"radiative_modifier":{"maxWindKmh":10,"maxCloudCoverPct":25}}'::jsonb,
    updated_at = now()
WHERE code = 'helada' AND parameters = '{}'::jsonb;

-- Configura los umbrales de calor si aún no se han ajustado.
UPDATE plataforma.risk_rules
SET parameters = '{"temperature":{"yellow":32,"orange":35,"red":39},"duration":{"heatThreshold":35,"prolongedHours":4,"scoreBonus":10},"sensitivity":{"crop":1,"phenology":1}}'::jsonb,
    updated_at = now()
WHERE code = 'golpe-de-calor' AND parameters = '{}'::jsonb;

-- Configura los umbrales de lluvia si aún no se han ajustado.
UPDATE plataforma.risk_rules
SET parameters = '{"thresholds":{"rain1h":{"yellow":5,"orange":15,"red":30},"rain3h":{"yellow":8,"orange":20,"red":40},"rain6h":{"yellow":10,"orange":25,"red":50},"rain24h":{"yellow":20,"orange":40,"red":80}}}'::jsonb,
    updated_at = now()
WHERE code = 'lluvia' AND parameters = '{}'::jsonb;

-- Migra los umbrales de tormenta al formato por dimensiones.
UPDATE plataforma.risk_rules
SET parameters = '{"gust":{"yellow":50,"orange":70,"red":90},"precipitationProbability":{"yellow":50,"orange":70,"red":85},"rainIntensity":{"yellow":5,"orange":15,"red":30}}'::jsonb,
    updated_at = now()
WHERE code = 'tormenta'
  AND parameters = '{"yellow":50,"orange":70,"red":90}'::jsonb;

-- Configura los umbrales de viento si aún no se han ajustado.
UPDATE plataforma.risk_rules
SET parameters = '{"gustKmh":{"yellow":30,"orange":50,"red":70},"labor":{"thresholdKmh":30,"minHours":1}}'::jsonb,
    updated_at = now()
WHERE code = 'viento' AND parameters = '{}'::jsonb;

-- Configura los umbrales de demanda hídrica si aún no se han ajustado.
UPDATE plataforma.risk_rules
SET parameters = '{"scoreLevels":{"yellow":20,"orange":40,"red":70},"effectiveRainFactor":0.8,"forecastModifier":{"heatThresholdC":32,"modifier":10}}'::jsonb,
    updated_at = now()
WHERE code = 'demanda-hidrica'
  AND parameters = '{"deficit72hMm":{"yellow":15,"orange":30,"red":50}}'::jsonb;

-- Configura los umbrales de riesgo fúngico si aún no se han ajustado.
UPDATE plataforma.risk_rules
SET parameters = '{"humidity":{"yellow":80,"orange":90},"temperature":{"minC":8,"maxC":28}}'::jsonb,
    updated_at = now()
WHERE code = 'riesgo-fungico' AND parameters = '{}'::jsonb;

-- Niveles por cultivo: las reglas pueden acotarse por crop_id y
-- phenological_state_id (la más específica gana sobre la global).
CREATE INDEX IF NOT EXISTS risk_rules_crop_state_idx
  ON plataforma.risk_rules (risk_type, crop_id, phenological_state_id);

-- Coeficiente de cultivo (Kc) y su validación, por cultivo y estado fenológico.
ALTER TABLE plataforma.crops
  ADD COLUMN IF NOT EXISTS kc real,
  ADD COLUMN IF NOT EXISTS kc_validated boolean NOT NULL DEFAULT false;

ALTER TABLE plataforma.phenological_states
  ADD COLUMN IF NOT EXISTS kc numeric,
  ADD COLUMN IF NOT EXISTS kc_validated boolean NOT NULL DEFAULT false;

-- Eventos de riesgo por parcela (resultado del motor de reglas, explicable).
CREATE TABLE IF NOT EXISTS plataforma.risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id uuid NOT NULL REFERENCES plataforma.plots(id) ON DELETE CASCADE,
  risk_type text NOT NULL,
  level text NOT NULL,
  score numeric,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  headline text NOT NULL,
  summary text NOT NULL,
  reason jsonb NOT NULL DEFAULT '{}'::jsonb,
  rule_version integer NOT NULL DEFAULT 1,
  weather_location_id uuid REFERENCES plataforma.weather_locations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'open',
  CONSTRAINT risk_events_level_ok
    CHECK (level IN ('green', 'yellow', 'orange', 'red'))
);

CREATE INDEX IF NOT EXISTS risk_events_plot_idx
  ON plataforma.risk_events (plot_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS risk_events_level_idx
  ON plataforma.risk_events (level, status);

-- Eventos de embudo / lead (tabla crítica de TecRural).
CREATE TABLE IF NOT EXISTS plataforma.lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES plataforma.users(id) ON DELETE SET NULL,
  anonymous_id text,
  plot_id uuid REFERENCES plataforma.plots(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_events_anon_idx
  ON plataforma.lead_events (anonymous_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lead_events_user_idx
  ON plataforma.lead_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lead_events_type_idx
  ON plataforma.lead_events (event_type);

-- Puntuaciones configurables por tipo de evento de lead.
CREATE TABLE IF NOT EXISTS plataforma.lead_scoring_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL UNIQUE,
  points integer NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Puntuación agregada por usuario (clasificación comercial, NO agronómica).
CREATE TABLE IF NOT EXISTS plataforma.lead_scores (
  user_id uuid PRIMARY KEY REFERENCES plataforma.users(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  classification text NOT NULL DEFAULT 'usuario',
  last_activity_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO plataforma.lead_scoring_config (event_type, points, description)
VALUES
  ('APP_VISIT', 1, 'Visita a la app'),
  ('LOCATION_SELECTED', 1, 'Ubicación seleccionada'),
  ('PLOT_CREATED', 5, 'Parcela creada'),
  ('CROP_SELECTED', 3, 'Cultivo seleccionado'),
  ('ALERT_OPENED', 1, 'Alerta abierta'),
  ('ALERTS_ENABLED', 5, 'Avisos activados'),
  ('WATER_VIEWED', 5, 'Vista de riego'),
  ('PHYTOSANITARY_VIEWED', 1, 'Vista fitosanitaria'),
  ('AI_DIAGNOSIS_STARTED', 5, 'Diagnóstico IA iniciado'),
  ('SENSOR_CTA_VIEWED', 2, 'CTA de sensores visto'),
  ('SENSOR_CTA_CLICKED', 10, 'CTA de sensores pulsado'),
  ('IRRIGATION_CTA_CLICKED', 10, 'CTA de riego pulsado'),
  ('CONTACT_REQUESTED', 20, 'Contacto solicitado'),
  ('QUOTE_REQUESTED', 30, 'Presupuesto solicitado')
ON CONFLICT (event_type) DO NOTHING;

-- Preferencias de notificación por usuario.
CREATE TABLE IF NOT EXISTS plataforma.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES plataforma.users(id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT false,
  email_enabled boolean NOT NULL DEFAULT false,
  telegram_enabled boolean NOT NULL DEFAULT false,
  whatsapp_enabled boolean NOT NULL DEFAULT false,
  yellow_enabled boolean NOT NULL DEFAULT false,
  orange_enabled boolean NOT NULL DEFAULT true,
  red_enabled boolean NOT NULL DEFAULT true,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Notificaciones programadas/enviadas (una por usuario, canal y dedup_key).
CREATE TABLE IF NOT EXISTS plataforma.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES plataforma.users(id) ON DELETE CASCADE,
  risk_event_id uuid REFERENCES plataforma.risk_events(id) ON DELETE SET NULL,
  channel text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  dedup_key text NOT NULL,
  provider_response jsonb,
  UNIQUE (dedup_key, channel, user_id)
);

CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON plataforma.notifications (user_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS notifications_status_idx
  ON plataforma.notifications (status, scheduled_at);

-- Solicitudes de contacto comercial
CREATE TABLE IF NOT EXISTS plataforma.commercial_contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id uuid REFERENCES plataforma.plots(id) ON DELETE SET NULL,
  service text NOT NULL,
  preferred_channel text NOT NULL,
  message text,
  anonymous_id text,
  user_id uuid REFERENCES plataforma.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS commercial_contact_requests_created_idx
  ON plataforma.commercial_contact_requests (created_at DESC);

-- Sensores — preparación arquitectura (sin conexión aún)
CREATE TABLE IF NOT EXISTS plataforma.sensors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id uuid NOT NULL REFERENCES plataforma.plots(id) ON DELETE CASCADE,
  device_id text NOT NULL UNIQUE,
  sensor_type text NOT NULL,
  model text,
  installed_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sensors_plot_idx ON plataforma.sensors (plot_id);
CREATE INDEX IF NOT EXISTS sensors_device_idx ON plataforma.sensors (device_id);

CREATE TABLE IF NOT EXISTS plataforma.sensor_readings (
  id bigserial PRIMARY KEY,
  sensor_id uuid NOT NULL REFERENCES plataforma.sensors(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  soil_moisture_pct double precision,
  air_temperature_c double precision,
  relative_humidity_pct double precision,
  soil_temperature_c double precision,
  battery_voltage double precision,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS sensor_readings_sensor_idx ON plataforma.sensor_readings (sensor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS sensor_readings_ts_idx ON plataforma.sensor_readings (timestamp DESC);

-- Seguridad: Row Level Security y roles (65)
ALTER TABLE plataforma.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plataforma.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE plataforma.plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE plataforma.risk_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE plataforma.lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE plataforma.lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE plataforma.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE plataforma.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas: anonymous solo lectura crops/rules, user solo sus datos, admin todo (via service_role)
CREATE POLICY users_own ON plataforma.users FOR ALL USING (auth.uid() = id OR current_setting('app.role', true) = 'admin');
CREATE POLICY farms_own ON plataforma.farms FOR ALL USING (user_id = auth.uid() OR current_setting('app.role', true) = 'admin');
CREATE POLICY plots_own ON plataforma.plots FOR ALL USING (farm_id IN (SELECT id FROM plataforma.farms WHERE user_id = auth.uid()) OR current_setting('app.role', true) = 'admin');
-- RLS para lecturas públicas de catálogo
CREATE POLICY crops_public_read ON plataforma.crops FOR SELECT USING (true);
CREATE POLICY risk_rules_public_read ON plataforma.risk_rules FOR SELECT USING (true);
