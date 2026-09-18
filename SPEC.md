# TecRural Alarmas — Especificación del MVP

PWA móvil orientada al trabajo en campo que permite a un agricultor:

1. Consultar riesgos agroclimáticos de su ubicación sin registrarse.
2. Registrar una o varias parcelas.
3. Asociar cultivo y, opcionalmente, estado fenológico.
4. Recibir alertas personalizadas.
5. Consultar el motivo de cada alerta.
6. Activar posteriormente avisos mediante Telegram, WhatsApp, correo o push.
7. Consultar información fitosanitaria oficial relevante.
8. Mostrar demanda hídrica orientativa.
9. Registrar interacciones que permitan cualificar comercialmente al usuario.
10. Ofrecer servicios TecRural relacionados con el problema detectado.

El MVP **NO debe intentar sustituir a AEMET, RAIF, SiAR ni a un técnico agrícola**.

> Recoger datos fiables, contextualizarlos para una parcela y cultivo determinados y explicarlos de forma sencilla.

## 2. Objetivos de negocio

- **Adquisición**: convertir visitantes anónimos en usuarios que registran al menos una parcela.
- **Engagement**: que los agricultores vuelvan a consultar las alertas.
- **Conversión**: detectar interés en sensores, riego, estaciones, diagnóstico vegetal, informes, seguimiento y otros servicios TecRural.

Funnel de éxito:

```text
usuarios → parcelas → alertas activadas → conversaciones comerciales → pilotos → clientes
```

## 3. Alcance geográfico inicial

- **Altiplano de Granada**: Huéscar, Baza, Puebla de Don Fadrique, Castril, Orce, Galera, Cúllar y cercanías. Cultivos: almendro, olivar, pistacho, cereal.
- **Costa Tropical**: Almuñécar, La Herradura, Salobreña, Motril. Cultivos: aguacate, mango, chirimoya.

La arquitectura NO debe codificar estos municipios como limitación técnica.

## 4. Principios técnicos

- TypeScript, tipado estricto, arquitectura modular.
- Reglas agronómicas configurables.
- Separación entre datos meteorológicos e interpretación agronómica.
- Trazabilidad de fuentes.
- Cachear llamadas externas; no llamar una API meteorológica por usuario.
- Procesamiento por ubicaciones geográficas y reutilización de previsiones.
- Auditoría de cada alerta generada.
- Posibilidad de añadir sensores físicos posteriormente.
- Diseño mobile-first, PWA instalable, interfaz sencilla.
- La lógica principal desacoplada de la base de datos para poder migrar a PostgreSQL estándar.

## 4.1 Arquitectura lógica (capas)

```text
FUENTES EXTERNAS → INGESTA → NORMALIZACIÓN → MOTOR METEOROLÓGICO
      → MOTOR AGRONÓMICO → MOTOR DE ALERTAS → { APP, NOTIFICACIONES → LEAD SCORING / CRM }
```

No mezclar responsabilidades. Mapeo a módulos:

| Capa | Módulo |
|---|---|
| Dominio (kernel compartido) | `src/lib/dominio` |
| 1. Fuentes externas | `src/lib/fuentes` |
| 2. Ingesta | `src/lib/ingesta` |
| 3. Normalización | `src/lib/normalizacion` |
| Adaptadores de fuentes (puerto `WeatherProvider`) | `src/lib/proveedores` |
| 4. Motor meteorológico | `src/lib/clima` |
| 5. Motor agronómico | `src/lib/agronomia` |
| 6. Motor de alertas | `src/lib/alertas` |
| 7. App | `src/app`, `src/components` |
| 7. Notificaciones | `src/lib/notificaciones` |
| Orquestación | `src/lib/aplicacion` |
| Persistencia (infraestructura) | `src/lib/datos` |
| Logging (transversal) | `src/lib/log` |
| Lead scoring / CRM | `src/lib/leads`, `src/lib/datos/crm-*`, `src/lib/aplicacion/crm.ts` |

Reglas de dependencia: `dominio` no depende de nadie; el flujo es
`1→2→3→4`, `5←4`, `6←5`, `7←6`; `aplicacion` es el único que compone
motores + persistencia + notificaciones; `datos` y `notificaciones` no dependen
de los motores.

## 4.2 Formatos internos canónicos

Toda fuente externa se normaliza a `WeatherHourly[]` y `OfficialWarning[]`
(definidos en `src/lib/dominio/proveedores.ts`). Los proveedores **nunca** se
consumen desde la UI: solo a través del motor meteorológico y de las rutas
internas (`/api/clima/horario`, `/api/avisos-oficiales`, `/api/riesgo`…).

- `WeatherHourly`: temperatura, sensación, humedad, rocío, precipitación y su
  probabilidad, viento (velocidad/racha/dirección), nubosidad, radiación solar,
  ET0, `provider` y `fetchedAt`.
- `OfficialWarning`: `phenomenon`, `severity`, `startsAt`, `endsAt`, `area`,
  `headline`, `description?`, `sourceUrl?`.

El motor meteorológico agrega `WeatherHourly[]` al modelo diario `ClimaPunto`
que consumen el motor agronómico y el de alertas, de modo que añadir o cambiar
un proveedor no altera las capas superiores.

## 5. Stack recomendado

- **Frontend**: Next.js (App Router), TypeScript, React, Tailwind CSS, shadcn/ui o equivalentes, PWA. MapLibre/OSM si hay mapa.
- **Backend**: Route Handlers / API interna. Workers, funciones serverless o servicio Node.js en VPS para procesos pesados o programados.
- **Base de datos**: PostgreSQL (Supabase en el MVP: autenticación, RLS, API, almacenamiento, despliegue).

## 6. Estado del repositorio

Estado actual: **scaffold funcional con persistencia PostgreSQL (Neon)**.

- PWA instalable con manifest y service worker.
- Evaluación de riesgo anónima por geolocalización (`/api/riesgo`).
- Motor de reglas agronómicas configurables (helada, golpe de calor, viento, demanda hídrica).
- Catálogo de 7 cultivos con fenología.
- Previsión meteorológica Open-Meteo con caché en memoria y caché persistida.
- Persistencia en un esquema `campo` **independiente** de lo ya existente en la base:
  - `campo.parcelas`, `campo.evaluaciones`, `campo.alertas`, `campo.weather_cache`.
  - El esquema `public` (users, farms, plots, crops, leads…) queda intacto.
- Parcelas anónimas por identificador de dispositivo (`/api/parcelas`), con
  evaluación de riesgo persistida (`/api/parcelas/[id]/evaluar`).
- Canales de aviso por dispositivo (`/api/avisos`): Telegram, correo (Resend),
  WhatsApp (Cloud API), push web y canal `log` para pruebas, con gravedad mínima
  por suscripción.
- Worker de alertas programable (`/api/worker/alertas`, protegido con
  `WORKER_SECRET`) que evalúa las parcelas suscritas, deduplica envíos y audita
  cada intento en `campo.notificaciones`.
- CRM integrado con el esquema `public` preexistente (`leads`, `lead_events`,
  `lead_interests`, `lead_scoring_config`, `service_offers`): señales del funnel
  (`/api/crm/eventos`), scoring con los pesos configurables de
  `public.lead_scoring_config` y resumen de cualificación (`/api/crm/lead`). No
  se altera la estructura de `public` (solo se insertan/actualizan filas).
- Interfaz común de fuentes `WeatherProvider` (`getForecast`, `getCurrent?`,
  `getWarnings?`) con adaptadores: AEMET (avisos oficiales/predicción),
  Open-Meteo (predicción horaria georreferenciada, respaldo del MVP), SiAR
  (ET0/radiación/agroclimático) y RAIF (avisos fitosanitarios). Salida
  normalizada a `WeatherHourly[]`/`OfficialWarning[]`; jerarquía con fallback a
  Open-Meteo. Rutas internas `/api/clima/horario` y `/api/avisos-oficiales`.
- Pantallas: Inicio, Parcelas, Alertas, Servicios, Ajustes, Fitosanitario.

## 7. Pendiente (siguientes fases)

- [x] Avisos por Telegram, WhatsApp, correo y push web (requiere credenciales en
  el entorno; canal `log` disponible para pruebas).
- [x] Worker de alertas programado (`/api/worker/alertas`, `WORKER_SECRET`) con
  deduplicación y auditoría en `campo.notificaciones`.
- [ ] Despliegue y cron en producción (Vercel Cron o VPS) apuntando al worker.
- [x] Adaptadores tras la interfaz `WeatherProvider`: AEMET, Open-Meteo, SiAR y
  RAIF, con jerarquía y fallback (a falta de credenciales/mapeos para
  activarlos en producción).
- [ ] Credenciales y mapeos de fuentes oficiales (AEMET municipio/área, SiAR
  estación, feed RAIF) y avisos fitosanitarios en tiempo real.
- [x] Reglas agronómicas parametrizables por cultivo/zona desde configuración
  (`plataforma.risk_rules`, `parameters` JSONB; respaldo a reglas integradas).
- [ ] Sensores físicos (lecturas en la parcela); integrar con `public.devices`/`public.device_readings`.
- [x] Registro de interacciones comerciales y cualificación del usuario
  (`public.leads`, `public.lead_events`, `public.lead_interests`), con scoring
  por pesos de `public.lead_scoring_config`.

## 9. Esquema de base de datos (`plataforma`)

Modelo de usuarios, explotaciones, parcelas, cultivos y estados fenológicos en
un esquema **aislado** `plataforma` (no toca `public` ni `campo`).

- Migración: `scripts/schema-plataforma.sql` → `npm run migrar:plataforma`.
- Definiciones Drizzle: `src/lib/datos/plataforma-schema.ts`.

Tablas:

- `users` (id, email, phone, name, auth_provider, created_at, updated_at,
  marketing_consent, marketing_consent_at, privacy_version).
- `farms` (id, user_id→users, name, municipality, province, created_at,
  updated_at).
- `plots` (id, farm_id→farms, name, latitude, longitude, elevation_m, area_ha,
  crop_id→crops, phenological_state_id→phenological_states, irrigated,
  irrigation_type, soil_type, created_at, updated_at).
- `crops` (id, slug UNIQUE, name_es, category, active,
  default_heat_threshold_c, default_cold_threshold_c).
- `phenological_states` (id, crop_id→crops, slug, name_es, order_index,
  cold_sensitivity, heat_sensitivity, water_sensitivity, active).

Índices: `(latitude, longitude)`, `crop_id` y `farm_id` en `plots` (PostGIS más
adelante). Semilla de cultivos: `almond`, `olive`, `pistachio`, `cereal`,
`avocado`, `mango`, `custard_apple`. Las sensibilidades
(`cold/heat/water_sensitivity`) son configurables por fila.

### 9.1 Datos meteorológicos

Puntos meteorológicos reutilizables por rejilla (0.02°): todas las parcelas
cercanas comparten la misma predicción. **No** se guarda una previsión
independiente por parcela.

- `plataforma.weather_locations`: `id`, `latitude`, `longitude`, `grid_key`
  UNIQUE, `elevation_m`, `created_at`.
- `plataforma.weather_hourly`: `id BIGSERIAL`, `weather_location_id`→locations,
  `provider`, `timestamp`, `temperature_c`, `apparent_temperature_c`,
  `relative_humidity_pct`, `dew_point_c`, `precipitation_mm`,
  `precipitation_probability_pct`, `wind_speed_kmh`, `wind_gust_kmh`,
  `wind_direction_deg`, `cloud_cover_pct`, `solar_radiation_wm2`, `et0_mm`,
  `fetched_at`. UNIQUE `(weather_location_id, provider, timestamp)`.

El motor meteorológico resuelve el punto por `grid_key`
(`src/lib/dominio/coordenadas.ts`), lee `weather_hourly` reciente
(`src/lib/datos/clima-repo.ts`) y, si no hay datos frescos, descarga, normaliza,
guarda y agrega a `ClimaPunto`. Sustituye la antigua caché JSON
`campo.weather_cache` (módulo eliminado).

### 9.2 Avisos oficiales

`plataforma.official_alerts`: `id`, `provider`, `external_id`, `phenomenon`,
`severity`, `area_code`, `area_name`, `starts_at`, `ends_at`, `headline`,
`description`, `source_url`, `raw_payload JSONB`, `created_at`, `updated_at`,
con UNIQUE `(provider, external_id)`.

`src/lib/datos/alertas-oficiales-repo.ts` los guarda de forma idempotente
(upsert por `provider`+`external_id`). El motor meteorológico persiste los
avisos obtenidos de AEMET/RAIF, y `GET /api/avisos-oficiales?persistidos=1`
devuelve los almacenados.

### 9.3 Fitosanidad

`plataforma.phytosanitary_alerts`: `id`, `provider`, `external_id`, `crop_id`,
`title`, `summary`, `province`, `municipality`, `severity`, `published_at`,
`source_url`, `raw_payload JSONB`, `created_at`, con UNIQUE
`(provider, external_id)`.

`src/lib/datos/fitosanitario-repo.ts` (upsert idempotente + listado con filtros
por cultivo/provincia) y `GET /api/fitosanitario`.

### 9.4 Motor de reglas

`plataforma.risk_rules`: `id`, `code` UNIQUE, `risk_type`, `name`,
`description`, `crop_id`, `phenological_state_id`, `parameters JSONB`,
`enabled`, `version`, `created_at`, `updated_at`.

Las reglas **no** están completamente codificadas en TypeScript:
`src/lib/aplicacion/reglas.ts` carga las reglas activas de la BD y
`src/lib/agronomia/reglas-config.ts` las convierte al contrato `Regla` aplicando
`parameters` (p. ej. `temperature.{orange,red}`,
`radiative_modifier.{maxWindKmh,maxCloudCoverPct}`) sobre el cultivo. Si no hay
reglas configuradas, usa las integradas. Semilla con las 4 reglas actuales
(`helada`, `golpe-de-calor`, `viento`, `demanda-hidrica`) y `GET /api/reglas`.

### 9.5 Eventos de riesgo

`plataforma.risk_events`: `id`, `plot_id`→plots, `risk_type`, `level`
(`green`|`yellow`|`orange`|`red`), `score NUMERIC`, `starts_at`, `ends_at`,
`headline`, `summary`, `reason JSONB`, `rule_version`,
`weather_location_id`→locations, `created_at`, `updated_at`, `status`.

`src/lib/datos/eventos-riesgo-repo.ts` los persiste y consulta;
`src/lib/aplicacion/riesgo-plataforma.ts` evalúa una parcela de plataforma con
las reglas activas y guarda un evento por riesgo, con `reason` explicable
(cultivo, fenofase, regla, severidad, datos utilizados, fuente y demanda
hídrica). Rutas `POST/GET /api/plataforma/plots/[id]/riesgo`. La severidad
interna se traduce a `level` (info→green, aviso→yellow, alerta→orange,
critica→red).

### 9.6 Eventos de lead

`plataforma.lead_events`: `id`, `user_id`→users, `anonymous_id`, `plot_id`→plots,
`event_type`, `metadata JSONB`, `points INTEGER`, `created_at`. Tipos iniciales:
`APP_VISIT`, `LOCATION_SELECTED`, `PLOT_CREATED`, `CROP_SELECTED`,
`ALERT_OPENED`, `ALERTS_ENABLED`, `WATER_VIEWED`, `PHYTOSANITARY_VIEWED`,
`AI_DIAGNOSIS_STARTED`, `SENSOR_CTA_VIEWED`, `SENSOR_CTA_CLICKED`,
`IRRIGATION_CTA_CLICKED`, `CONTACT_REQUESTED`, `QUOTE_REQUESTED`.

`src/lib/datos/lead-events-repo.ts` los persiste y consulta;
`src/lib/aplicacion/lead-events.ts` mapea las señales internas a estos tipos y
los registra (los `points` provienen de los pesos de
`public.lead_scoring_config`). `POST/GET /api/lead-events`.

### 9.7 Puntuación de lead

`plataforma.lead_scoring_config` (`event_type` UNIQUE, `points`, `description`)
define las puntuaciones **configurables**; `plataforma.lead_scores`
(`user_id` PK→users, `score`, `classification`, `last_activity_at`,
`updated_at`) guarda la agregada por usuario.

Clasificación (`src/lib/dominio/lead-scores.ts`): 0–5 usuario, 6–15 lead frío,
16–30 lead templado, 31+ lead caliente. `src/lib/aplicacion/lead-events.ts`
puntúa con la config (nunca desde el cliente) y, si hay `user_id`, recalcula en
`src/lib/datos/lead-scores-repo.ts`; los anónimos se puntúan al vuelo.
`GET /api/lead-score?userId=|anonymousId=`.

**Este scoring es comercial y NO se usa para decisiones agronómicas**:
`agronomia` y `alertas` no lo importan (verificado).

### 9.8 Notificaciones

`plataforma.notification_preferences`: `id`, `user_id` UNIQUE→users,
`push_enabled`, `email_enabled`, `telegram_enabled`, `whatsapp_enabled`,
`yellow_enabled` (false por defecto), `orange_enabled`/`red_enabled` (true),
`quiet_hours_start`/`quiet_hours_end` (`time`), `created_at`, `updated_at`.

`plataforma.notifications`: `id`, `user_id`→users, `risk_event_id`→risk_events,
`channel`, `title`, `message`, `status`, `scheduled_at`, `sent_at`,
`dedup_key`, `provider_response JSONB`, con UNIQUE `(dedup_key, channel,
user_id)`.

`src/lib/datos/notificaciones-repo.ts` (preferencias upsert, notificaciones
upsert/listado, marcar enviada) y `src/lib/dominio/notificaciones.ts` con
`puedeNotificar` y `dentroDeHorasSilencio` (la franja de silencio gobierna el
envío). Rutas `GET/PUT /api/notificaciones/preferencias` y
`GET/POST /api/notificaciones`.

### 9.9 Motor de evaluadores de riesgo

Contrato `RiskEvaluator` (`src/lib/dominio/evaluacion.ts`):
`evaluate(context: RiskContext): Promise<RiskEvaluation | null>`.
Implementaciones en `src/lib/alertas/evaluadores/`: `FrostRiskEvaluator`
(helada), `HeatRiskEvaluator` (golpe-de-calor), `RainRiskEvaluator` (lluvia),
`StormRiskEvaluator` (tormenta), `WindRiskEvaluator` (viento),
`WaterDemandEvaluator` (demanda-hídrica) y `PhytosanitaryRiskEvaluator`
(fitosanitario, a partir de `phytosanitary_alerts`).

`evaluarRiesgos(context)` los ejecuta en paralelo y aislados (un fallo no tumba
al resto) y devuelve `RiskEvaluation[]` con `level` (green/yellow/orange/red) y
`reason` explicable. Helada/calor/viento/demanda reutilizan las reglas
agronómicas (umbrales ajustables por `risk_rules.parameters`); lluvia y tormenta
usan umbrales configurables; fitosanitario consume los avisos persistidos.
`src/lib/aplicacion/riesgo-plataforma.ts` persiste cada evaluación como
`risk_events`.

### 9.10 Alerta de helada

`FrostRiskEvaluator` usa la temperatura horaria (mínima), punto de rocío,
humedad, viento y nubosidad, más cultivo y fenología. Umbrales MVP
**configurables** en `risk_rules.parameters` (por defecto: GREEN >3, YELLOW
1–3, ORANGE −1–1, RED ≤−1):

```json
{ "temperature": { "yellow": 3, "orange": 1, "red": -1 },
  "radiative_modifier": { "maxWindKmh": 10, "maxCloudCoverPct": 25 } }
```

Si `Tmin ≤ 3` y `viento ≤ maxWindKmh` y `nubosidad ≤ maxCloudCoverPct`, se marca
`radiativeCoolingLikely = true` en `reason` y se añade al resumen la frase
«Patrón compatible con enfriamiento radiativo.». Nunca se afirma «helada
radiativa confirmada». El nivel verde (sin riesgo) no emite evento.

### 9.11 Alerta de calor

`HeatRiskEvaluator` usa Tmax (máxima en las próximas 72 h), horas por encima del
umbral, humedad mínima y ET0, más cultivo y fenología. Umbrales **configurables**
(`risk_rules.parameters`; por defecto GREEN <32, YELLOW 32–35, ORANGE 35–39,
RED ≥39):

```json
{ "temperature": { "yellow": 32, "orange": 35, "red": 39 },
  "duration": { "heatThreshold": 35, "prolongedHours": 4, "scoreBonus": 10 },
  "sensitivity": { "crop": 1, "phenology": 1 } }
```

Se cuentan las horas con `T ≥ heatThreshold`; si `hotHours ≥ prolongedHours` se
incrementa el score (`+scoreBonus`). El score final se multiplica por la
sensibilidad de cultivo y fenología. El `reason` incluye `temperatureMaxC`,
`hotHours`, `relativeHumidityMinPct`, `et0MmMax` y las sensibilidades. El nivel
verde (sin riesgo) no emite evento.

### 9.12 Alerta de lluvia

`RainRiskEvaluator` usa precipitación 1 h/3 h/6 h/24 h, probabilidad y **avisos
oficiales**. Prioridad absoluta: si hay un aviso oficial de lluvia activo, se
emite como `AVISO OFICIAL` conservando su nivel (no se reinterpreta). Si no,
emite una `ESTIMACIÓN TECRURAL` comparando las sumas por ventana con umbrales
configurables (`risk_rules.parameters`; por defecto 1 h 5/15/30, 3 h 8/20/40,
6 h 10/25/50, 24 h 20/40/80 mm).

`reason.source` distingue `official` de `tecrural`; el `headline` va prefijado
con «AVISO OFICIAL:» o «ESTIMACIÓN TECRURAL:».

### 9.13 Alerta de tormenta

`StormRiskEvaluator` (MVP conservador) prioriza el **aviso oficial**: si existe,
se emite como `AVISO OFICIAL` conservando su nivel. En su defecto, estima con
probabilidad de precipitación + intensidad máxima + racha, tomando el **mínimo**
de las tres dimensiones (solo hay tormenta si las tres lo indican). Umbrales
configurables (`risk_rules.parameters`: `gust`, `precipitationProbability`,
`rainIntensity`). Headline «Riesgo de tormenta»; **nunca** se afirma granizo,
tornado ni rayos (radar no disponible). El `reason` incluye
`stormProbabilityPct`, `rainIntensityMm`, `windGustKmh`, `radarDisponible` y
`limitaciones`, y `reason.source` distingue `official` de `tecrural`.

### 9.14 Alerta de viento

`WindRiskEvaluator` usa viento medio, racha máxima y duración sobre las próximas
72 h. Umbrales **configurables** (`risk_rules.parameters.gustKmh`; por defecto
GREEN <30, YELLOW 30–50, ORANGE 50–70, RED >70). Cuando procede (horas con racha
≥ `labor.thresholdKmh` durante ≥ `labor.minHours`) añade «Condiciones poco
favorables para determinadas labores». **No** da instrucciones sobre aplicación
concreta de fitosanitarios. El `reason` incluye `windSpeedMeanKmh`,
`windGustMaxKmh`, `durationHours`, `hoursOverLaborThreshold` y
`laborPocoFavorable`.

### 9.15 Demanda hídrica

`WaterDemandEvaluator` calcula un balance meteorológico (ET0 − precipitación)
sobre las próximas 72 h con umbrales configurables
(`risk_rules.parameters.deficit72hMm`; por defecto 15/30/50 mm). Headline
«Demanda hídrica». **Sin sensor de suelo no se afirma estrés hídrico**: el
resumen dice «Estimación meteorológica orientativa; sin sensor de suelo no se
puede confirmar el estado hídrico real del cultivo.» y el `reason` marca
`sensorSuelo: false`. Terminología permitida: «Demanda hídrica» / «riesgo
meteorológico de déficit hídrico».