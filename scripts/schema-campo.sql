-- Esquema aislado para la app de campo (MVP TecRural).
-- NO toca ningun objeto del esquema `public` existente.

CREATE SCHEMA IF NOT EXISTS campo;

CREATE TABLE IF NOT EXISTS campo.parcelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispositivo_id text NOT NULL,
  nombre text NOT NULL,
  cultivo_slug text NOT NULL,
  latitud double precision NOT NULL,
  longitud double precision NOT NULL,
  creada_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parcelas_coords_ok
    CHECK (latitud BETWEEN -90 AND 90 AND longitud BETWEEN -180 AND 180)
);

CREATE TABLE IF NOT EXISTS campo.evaluaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcela_id uuid NOT NULL REFERENCES campo.parcelas(id) ON DELETE CASCADE,
  evaluada_en timestamptz NOT NULL DEFAULT now(),
  fenofase text,
  fuente_datos jsonb NOT NULL,
  demanda_hidrica jsonb
);

CREATE TABLE IF NOT EXISTS campo.alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id uuid NOT NULL REFERENCES campo.evaluaciones(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  titulo text NOT NULL,
  mensaje text NOT NULL,
  severidad text NOT NULL,
  regla text NOT NULL,
  fenofase text,
  datos_utilizados jsonb NOT NULL DEFAULT '[]'::jsonb,
  fuente jsonb NOT NULL,
  vigencia_hasta date,
  creada_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT alertas_severidad_ok
    CHECK (severidad IN ('info', 'aviso', 'alerta', 'critica')),
  CONSTRAINT alertas_tipo_ok
    CHECK (tipo IN ('helada', 'golpe-de-calor', 'viento', 'demanda-hidrica'))
);

CREATE TABLE IF NOT EXISTS campo.weather_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  provider text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  data jsonb NOT NULL,
  raw jsonb,
  UNIQUE (provider, slug)
);

CREATE INDEX IF NOT EXISTS parcelas_dispositivo_idx
  ON campo.parcelas (dispositivo_id);

CREATE INDEX IF NOT EXISTS evaluaciones_parcela_idx
  ON campo.evaluaciones (parcela_id, evaluada_en DESC);

CREATE INDEX IF NOT EXISTS alertas_evaluacion_idx
  ON campo.alertas (evaluacion_id);

CREATE INDEX IF NOT EXISTS weather_cache_lookup_idx
  ON campo.weather_cache (provider, slug, expires_at);

-- Canales de aviso suscritos por un dispositivo (parcela_id NULL = todas sus parcelas).
CREATE TABLE IF NOT EXISTS campo.suscripciones_aviso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispositivo_id text NOT NULL,
  parcela_id uuid REFERENCES campo.parcelas(id) ON DELETE CASCADE,
  canal text NOT NULL,
  destino text NOT NULL,
  severidad_minima text NOT NULL DEFAULT 'aviso',
  activa boolean NOT NULL DEFAULT true,
  creada_en timestamptz NOT NULL DEFAULT now(),
  verificada_en timestamptz,
  CONSTRAINT suscripciones_canal_ok
    CHECK (canal IN ('telegram', 'email', 'whatsapp', 'push', 'log')),
  CONSTRAINT suscripciones_severidad_ok
    CHECK (severidad_minima IN ('info', 'aviso', 'alerta', 'critica'))
);

-- Auditoria de cada aviso intentado/enviado (permite deduplicar y reintentar).
CREATE TABLE IF NOT EXISTS campo.notificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suscripcion_id uuid NOT NULL REFERENCES campo.suscripciones_aviso(id) ON DELETE CASCADE,
  alerta_id uuid REFERENCES campo.alertas(id) ON DELETE SET NULL,
  parcela_id uuid NOT NULL REFERENCES campo.parcelas(id) ON DELETE CASCADE,
  canal text NOT NULL,
  clave text NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente',
  intentos integer NOT NULL DEFAULT 0,
  ultimo_intento_en timestamptz,
  enviada_en timestamptz,
  error text,
  creada_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notificaciones_estado_ok
    CHECK (estado IN ('pendiente', 'enviada', 'error'))
);

CREATE INDEX IF NOT EXISTS suscripciones_dispositivo_idx
  ON campo.suscripciones_aviso (dispositivo_id, activa);

CREATE INDEX IF NOT EXISTS notificaciones_dedup_idx
  ON campo.notificaciones (parcela_id, canal, clave, enviada_en DESC);

CREATE INDEX IF NOT EXISTS notificaciones_suscripcion_idx
  ON campo.notificaciones (suscripcion_id, creada_en DESC);

-- Cuentas de usuario: se añade user_id (nullable) para que las filas creadas
-- como anónimas puedan reclamarse al iniciar sesión. `dispositivo_id` se mantiene.
ALTER TABLE campo.parcelas ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE campo.suscripciones_aviso ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS parcelas_usuario_idx ON campo.parcelas (user_id);
CREATE INDEX IF NOT EXISTS suscripciones_usuario_idx
  ON campo.suscripciones_aviso (user_id, activa);