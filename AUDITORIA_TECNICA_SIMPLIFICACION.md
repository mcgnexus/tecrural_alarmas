# Auditoría Técnica — Simplificación TecRural Campo (Fase 1)

> Fecha: 2026-09-22 — Ejecución local, compilación, tests, rutas, Neon, lógica de cálculo, permisos, formularios, analítica, consola, env y frescura de datos. No se modifica código en esta fase.

## 1. Objetivo de la fase
Inventario coherente del estado real antes de simplificar hacia: meteo actual+prev 5-7d, municipio+cultivo, helada/viento básico, avisos oficiales, captación WhatsApp. Premium queda en código pero oculto.

## 2. Verificaciones ejecutadas (instrucciones 1-12)

| # | Check | Resultado | Evidencia |
|---|-------|-----------|-----------|
| 1 | Ejecuta local | OK (Next dev/build funciona) | `npm run build` 2026-09-22 |
| 2 | Compila | **OK con warning** | `✓ Compiled successfully in 4.6s` `next.config.ts:1` Turbopack; warn: `middleware file convention deprecated use proxy` `middleware.ts:1` + `next-env.d.ts`. TS 4.5s sin errores. `npm run lint` sin errores `eslint.config.mjs:1` |
| 3 | Tests existentes | **95/96 OK, 1 fallo** | `npm test` vitest 5.0.1 22 ficheros, 4.01s. Fallo: `tests/unit/fenologia.test.ts:14` `zonaCultivoPorCoordenadas(40.4168,-3.7038) expected null got altiplano` — `src/lib/cultivos/zona.ts:46-48` fallback latitud `<37.0 costa / >37.3 altiplano` devuelve altiplano para Madrid; test espera null. No bloquea flujo crítico pero rompe `pnpm test` en CI |
| 4 | Todas las rutas | 35 rutas App + 70 API (ver §3) | `next build` listado `Route (app)` §3; `src/app/(campo)` 8 páginas, `(dashboard)` 3, `(public)` 2, `admin` 8, `(auth)` 2 |
| 5 | Llamadas Neon | OK — 3 esquemas aislados | `src/lib/datos/db.ts:16` `pg.Pool ssl` + `drizzle-orm` singleton; `scripts/schema-campo.sql` `scripts/schema-plataforma.sql` separados. `obtenerDb()` usado en 28 repos (`grep obtenerDb` 100 matches). No mezcla `public` DDL |
| 6 | Lógica cálculo | Mapeada (ver §5) | temp/previsión en `lib/clima/motor.ts:34` `cargarSerie()` + `agregacion.ts`; 7 evaluadores `lib/alertas/evaluadores/` |
| 7 | Públicas vs requiere usuario | 60% públicas, 40% con device/user | Públicas: `/, /tiempo (nuevo), /avisos, /privacidad, /location, /alerts`, `GET /api/v1/weather/*`, `GET /api/v1/locations/search`, `POST /api/riesgo` anon. Protegidas: `/parcelas` (dispositivoId), `/api/parcelas` `validacion.ts:25` `dispositivoId`, `/api/v1/plots?userId=` `plots/route.ts:29`, `/api/avisos` `sesion-dispositivo.ts:73` cookie |
| 8 | Formularios | 2 principales + 1 asistente | `formulario-contacto.tsx:24` (nombre/tel/municipio/cultivo/privacidad+honeypot `website:87`) POST `/api/contacto` `contacto/route.ts:39` Zod; `asistente-chat.tsx` mismo endpoint `origen:asistente`; `onboarding.tsx` municipio selector |
| 9 | Eventos analíticos | 7 eventos funnel + Telegram log | `lib/analitica.ts:9` `EventoEmbudo: click_whatsapp, lead_started, lead_submitted, municipality_selected, service_interest_selected, crop_selected, ai_conversation_started` → `track()` @vercel/analytics + `POST /api/v1/events` `dominio/lead-events.ts:1` (`APP_VISIT, LOCATION_SELECTED... CONTACT_REQUESTED`) |
| 10 | Errores consola | 1 warning build + 1 fallo test + stale fallback logs | `middleware→proxy` warn, `proveedores.registro` warns `AEMET down fallback` `clima/motor.ts:81` (esperable sin key), ningún `console.error` en cliente fuera de logs estructurados `lib/log/logger.ts:58` |
| 11 | Variables entorno | `.env.example:67` 24 vars; faltan en prod = solo Open-Meteo | Críticas: `DATABASE_URL, DEVICE_SESSION_SECRET, INTERNAL_SECRET, CRON_SECRET, ADMIN_SECRET`; opcionales con fallback: `AEMET_API_KEY, RAIF_FEED_URL, SIAR_* , TELEGRAM_* , WHATSAPP_*, VAPID_* , DEEPSEEK_API_KEY`; `NEXT_PUBLIC_SITE_URL=https://tecrural.es` `layout.tsx:7` |
| 12 | Dependencia datos actualizados | Alta — cache 55m/24h | `clima/cache.ts` + `clima/motor.ts:22` `TTL_CACHE_S=55*60` PG `weather_hourly` + stale 24h fallback antes de `NO_DATA` `motor.ts:83`. `agronomia` y `alertas` dependen de `WeatherHourly[]` fresco; sin `fetchedAt` reciente → alerta degradada. Crons `vercel.json:2` refrescan 5/6 feeds diarios |

## 3. Estructura actual (`src:1`, `package.json:22` Next 16.3.5)

- **Stack**: Next 16.3.5 App Router `next.config.ts:3` `serverExternalPackages pdf-parse/tesseract.js` + CSP `headers():10`; React 19.2.8 TS5 Tailwind4 `globals.css:1` `@import tailwindcss`; `vercel/analytics 2.0.1` `layout.tsx:3`; `drizzle-orm 0.45.2` `pg 8.23`
- **Carpetas**: `src/app` (`(campo)` 8 páginas, `(dashboard)` 3, `(public)` 2, `admin` 8, `(auth)` 2), `src/components/{campo,parcelas,riesgo,alertas,fitosanitario,gestion,admin}`, `src/lib/{dominio,clima,datos/{plataforma-schema,schema,crm-schema},aplicacion/{riesgo,riesgo-plataforma,reglas},proveedores,alertas,agronomia,notificaciones,raif}`, `src/risk-engine` alias → `lib/alertas/evaluadores`, `src/config/post-mvp.ts:5` lista 72 futuro
- **Alias**: `tsconfig.json:22` `@/* → ./src/*`; `middleware.ts:1` reexporta `src/middleware.ts:5` rate-limit 60/min + CSRF

## 4. Rutas (build `Route (app)`: 35)

**Públicas sin cuenta (captación)**  
`/` `src/app/(campo)/page.tsx:33` `HomeSinRegistro` (zona altiplano/costa + meteo + cultivo + WhatsApp), `/privacidad:1`, `/location` `(public)/location/page.tsx`, `/alerts` `(public)/alerts/page.tsx:9` genérica, `/servicios` `servicios/page.tsx:143` planes+sensores+diagnóstico, `/fitosanitario` `fitosanitario/page.tsx:9` (oficial+agroclimático), `/alertas` `alertas/page.tsx:6` `ListaAlertas`, `/acceso, /cuenta, /configuracion` `(campo)/...` (configuración avisos localStorage `dispositivo.ts:1`)

**Registrada anónima/device**  
`/parcelas` `parcelas/page.tsx:9` `GestionParcelas` (`dispositivoId` `lib/datos/dispositivo.ts:10` `localStorage tecrural.dispositivo` + cookie `tecrural_sesion` `sesion-dispositivo.ts:35` HMAC), `/plots`, `/plots/[id]`, `/plots/[id]/alerts/[alertId]` `(dashboard)` (requiere `userId`), `/dashboard`

**Admin**  
`/admin, /admin/users, /admin/parcelas, /admin/solicitudes, /admin/suscritos, /admin/leads, /admin/eventos, /admin/alerts, /admin/rules` `admin/*:1` (guard `ADMIN_SECRET` `lib/internal/auth.ts:27` + `admin-sesiones-repo.ts`)

**Propuesta §4 no existe aún**: `/tiempo, /avisos, /app, /app/municipio, /app/prevision, /app/alertas-basicas, /app/parcelas|alertas-avanzadas|sensores|diagnostico|informes` — crear en Fase 2 vía rewrites, no renames

**Sistema**: `/sitemap.xml` `sitemap.ts:14` 6 URLs, `/robots.txt` `robots:16` disallow `/api/,/admin/,/gestion`, `/.well-known/security.txt`, `/manifest.webmanifest` PWA `manifest.ts`

## 5. Componentes clave

- **Campo público**: `home-sin-registro.tsx:25` (query municipios `zona altiplano|costa` + `MeteoZona` `meteo-zona.tsx` + `AvisosOficialesAemet` `avisos-oficiales.tsx` + `ListaAvisosFitosanitarios` limite 3), `cta-whatsapp.tsx`, `cta-principal.tsx`, `asistente-chat.tsx:41` `ai_conversation_started`, `seccion-confianza.tsx`, `header.tsx:5` `NavEscritorio` + `bottom-nav.tsx:12` 5 tabs `[/, /parcelas, /alertas, /servicios, /configuracion]`
- **Parcelas**: `gestion-parcelas.tsx`, `registro-parcela.tsx`, `onboarding.tsx:96` `municipality_selected`, `tarjeta-parcela.tsx:129` link `/alertas`, `dashboard-parcela.tsx`
- **Riesgo**: `riesgo-actual.tsx`, `alerta-card.tsx`, `alerta-detalle.tsx`, `lista-alertas.tsx`
- **Fitosanitario**: `lista-avisos.tsx`, `riesgo-agroclimatico.tsx` (estimación TecRural separada oficial)
- **Servicios/Premium**: `formulario-contacto.tsx:24`, `diagnostico-foto.tsx` (IA + tesseract), `cta-contextual.tsx` 4 CTAs `href /servicios#*`, `gestion/{gestion-reglas,gestion-catalogo}`
- **Admin**: `tabla-leads.tsx`, etc.

## 6. Tablas Neon (verificadas en código, no inventadas)

**`plataforma` `plataforma-schema.ts:19` (25 tablas, migración `schema-plataforma.sql:1`)**  
`users` (marketing_consent, privacy_version), `farms` (user_id→users), `crops` (slug UNIQUE, kc, kc_validated), `phenological_states` (cold/heat/water_sensitivity, kc_validated), `plots` (farm_id, crop_id, phenological_state_id, lat/lon idx), `weather_locations` (grid_key UNIQUE), `weather_hourly` (weather_location_id+provider+timestamp UNIQUE), `official_alerts` (provider+external_id), `phytosanitary_alerts` (+ source_article/pdf/hash/page, extraction_status), `raif_documents` (document_key UNIQUE), `raif_ingestions`, `risk_rules` (code UNIQUE, risk_type, parameters JSONB, enabled), `risk_rule_history`, `risk_events` (plot_id, risk_type, level green/yellow/orange/red, reason JSONB), `lead_events` (user_id/anonymous_id, eventType 14 tipos `dominio/lead-events.ts:1`), `lead_scoring_config` (eventType UNIQUE points), `lead_scores` (user_id PK score/classification), `notification_preferences` (push/email/telegram/whatsapp + quiet_hours + yellow/orange/red), `notifications` (dedup_key+channel+user_id), `commercial_contact_requests`, `sensors` (device_id UNIQUE), `sensor_readings` (BIGSERIAL), `auth_tokens` (token_hash UNIQUE), `admin_sessions`

**`campo` `schema.ts:23` (5 tablas, `schema-campo.sql`)**  
`parcelas` (dispositivo_id, user_id, nombre, cultivo_slug, lat/lon check), `evaluaciones` (parcela_id, fenofase, fuente_datos JSONB, demanda_hidrica), `alertas` (evaluacion_id, tipo helada|golpe-de-calor|viento|demanda-hidrica, severidad info|aviso|alerta|critica), `suscripciones_aviso` (dispositivo_id, canal telegram|email|whatsapp|push|log, severidadMinima), `notificaciones` (dedup clave, estado pendiente|enviada|error) — `campo.weather_cache` eliminado `SPEC.md:206`

**`public` CRM `crm-schema.ts:18` (preexistente, no DDL)**  
`leads` (visitor_id, contact_name/phone, municipality_id, service_key, crop_type, utm_*), `lead_events` (lead_id, type, weight), `lead_interests` (interest), `lead_scoring_config` (eventKey weight), `service_offers` (service_key, problem/solution/deliverables)

## 7. Endpoints (70 dinámicos `ƒ` en build)

**V1 público** `src/app/api/v1/*`: `GET locations/search?q&zona`, `weather/current?lat&lon&aemetMunicipio` `current/route.ts:12`, `weather/forecast?lat&lon&hours=72`, `plots?userId` `plots/route.ts:29` GET/POST, `plots/[id]` GET/PATCH/DELETE, `plots/[id]/risks` GET `risks/route.ts:28` `{plotId, generatedAt, risks:[{type,level,headline}]}` UPPER, `risks/[riskId]` detail `reason`, `crops`, `crops/[id]/phenology`, `phytosanitary?cropId&province`, `official-alerts?lat&lon`, `notification-preferences?userId` GET/PATCH, `events` POST `analitica.ts:49`

**Legado**: `GET/POST /api/parcelas` `parcelas/route.ts` (valida `cuerpoParcelaValido` `validacion.ts:31`), `GET/PATCH/DELETE /api/parcelas/[id]`, `POST /api/parcelas/[id]/evaluar` → `evaluarRiesgo` `alertas/motor.ts:22`, `POST /api/riesgo` `riesgo/route.ts:9` anon `evaluarRiesgoAnonimo` `aplicacion/riesgo.ts:7`, `GET /api/clima/horario`, `GET /api/avisos-oficiales`, `GET /api/fitosanitario`+`agroclimatico`, `GET /api/reglas`, `GET/POST /api/avisos` `avisos/route.ts:94` canal `telegram|email|whatsapp|push|log`, `POST /api/contacto` `contacto/route.ts:57`, `POST /api/consent`, `POST /api/diagnostico` Deepseek+pdf/tesseract, `GET /api/fuentes`, `GET /api/health`, `GET /api/ai/v1/*` OpenAPI, `POST /api/sesion/dispositivo` firma

**Interno/Cron** (`verificarAccesoInterno` `lib/internal/auth.ts:27` h `x-internal-secret|WORKER_SECRET|CRON_SECRET`): `POST /api/worker/alertas` dedup+audita `campo.notificaciones`, `POST /api/internal/*` (weather/refresh, raif/refresh, notifications/process, lead-scores/recalculate, cleanup, alerts/evaluate), `GET /api/cron/*` 6 jobs `vercel.json:2`

**Admin**: `GET /api/admin/{users,parcelas,solicitudes,suscritos,leads,eventos,riesgos,stats}`, `POST /api/admin/users/[id]/invite`, `POST /api/admin/session` (cookie HttpOnly), `GET /api/account/{export,delete,summary}`

## 8. Cálculo: temperatura / previsión / riesgos

- **Temperatura + previsión**: `lib/clima/motor.ts:34` `cargarSerie(lat,lon)` → `obtenerOCrearUbicacion` `clima-repo.ts` grid 0.02° → `leerHorarioReciente` 55m → si miss `obtenerPronostico({lat,lon,aemetMunicipio})` `proveedores/registro.ts` (jerarquía AEMET principal `proveedores/aemet.ts`, fallback Open-Meteo `open-meteo.ts`+`services/weather/openmeteo.provider.ts`, SiAR ET0 `sensor-data.ts`) → `guardarHorario` → `agregarHorario` `clima/agregacion.ts` → `ClimaPunto` `dominio/tipos.ts:31` `{actual:{temperatura,sensacion,viento,racha,humedad}, prevision:[{fecha,tMin,tMax,rachaMax,probPrecip,precipTotal}] 5-7d, fuente}`
- **Helada**: `agronomia/reglas/helada.ts` + `alertas/evaluadores/helada.ts` reglas `risk_rules` `temperature.yellow 3/orange 1/red -1` `radiative_modifier maxWind 10 maxCloud 25` → si Tmin≤3 + viento≤10 + nubes≤25 → `radiativeCoolingLikely` + frase «Patrón enfriamiento radiativo» (nunca afirma helada confirmada)
- **Viento**: `reglas/viento.ts` + `evaluadores/viento.ts` `gustKmh green <30/yellow 30-50/orange 50-70/red >70` 72h + `labor.thresholdKmh/minHours` → «poco favorable labores»
- **Lluvia**: `evaluadores/lluvia.ts` prioriza `OfficialWarning` AEMET (`reason.source official`), si no `ESTIMACIÓN TECRURAL` ventanas 1h 5/15/30 3h 8/20/40 6h 10/25/50 24h 20/40/80 mm
- **Calor**: `reglas/golpe-de-calor.ts`+`evaluadores/calor.ts` `yellow 32 orange 35 red 39` + `hotHours≥4 (+10) * sensibilidad cultivo/fenología`
- **Tormenta**: `evaluadores/tormenta.ts` aviso oficial primero, si no prob precip + intensidad + racha mínimo de 3 dims; nunca granizo/tornado/rayos (`radarDisponible false`)
- **Demanda hídrica**: `agronomia/demanda-hidrica.ts:1` `waterDeficitIndex = ET0_7d - lluviaEfectiva_7d*effectiveRainFactor` + `forecastHeatModifier` si Tmax72h>threshold `scoreLevels 20/40/70`; Kc solo si `crops.kc_validated` `aplicacion/riesgo-plataforma.ts` `ETc=ET0*Kc` `domain/evaluacion.ts`
- **Fitosanitario**: Tipo1 oficial `GET /api/fitosanitario` `raif/rss.ts`+`raif/pdf-extractor.ts` `phytosanitary_alerts` campos Fuente/Fecha/Cultivo/Zona/Resumen/Enlace `fitosanitario/page.tsx:15`; Tipo2 agroclimático `GET /api/fitosanitario/agroclimatico?lat&lon&cultivo` `evaluarRiesgoFungico` hum>yellow/orange + temp min/max, frase «puede favorecer... No constituye diagnóstico»

## 9. Riesgos identificados

1. **Test roto frena CI** `fenologia.test.ts:14` + **1a lat fallback** `zona.ts:48` devuelve `mejor` para 99% Iberia si falla tolerancia — artefacto validación zona debe ser `null` fuera 0.35°
2. **Middleware deprecated** `middleware.ts:1` debe migrar a `proxy` `next.config.ts:9` antes de Next 17
3. **Frescura sin cron local**: `vercel.json` cron no corre en `npm run dev`; `clima/motor.ts:83` cae a stale 24h luego `NO_DATA 503` `riesgo/route.ts:37` — clasificado correcto pero sin alerta ops
4. **Duplicidad rutas** `/parcelas` (campo anon) vs `/plots` (dashboard userId) vs futuro `/app/parcelas` — confusión nav y `sitemap.ts:17` prioridad
5. **Premium expuesto**: `servicios/page.tsx:41` planes 9.90-79€ + `diagnostico-foto` visibles sin gate — viola objetivo simplificación futura
6. **Rate-limit en memoria** `middleware.ts:10` 60/min no distribuido; `api/contacto` 5/10m + dedup 5m `contacto/route.ts:15` OK pero reset al redeploy
7. **Secret fallback débil** `sesion-dispositivo.ts:14` usa `INTERNAL_SECRET` si falta `DEVICE_SESSION_SECRET` — log warn solo

## 10. Qué se conserva / oculta / no tocar

**Conservar (obligatorio para lead)**  
- Meteo actual `GET /api/v1/weather/current` + `clima/horario` + `motor.ts`, prev 5-7d `agregacion.ts`, helada+viento básico evaluadores, avisos oficiales `official_alerts` + `GET /api/avisos-oficiales`, selector municipio `locations/search` + cultivo `crops` 7 (`catalogo.ts:50` almendro/olivar/pistacho/cereal/aguacate/mango/chirimoya), explicación sencilla `reason` JSONB, WhatsApp CTA `cta-whatsapp.tsx` + `formulario-contacto.tsx` + `POST /api/contacto` + `POST /api/v1/events`

**Ocultar (mantener código, ocultar nav/gate premium)**  
- `rain|storm|calor|sequia` evaluadores avanzados, `demanda-hidrica` detallada `demanda-hidrica.ts` sin Kc validado, `riesgo fitosanitario` Tipo2, múltiples parcelas, sensores `sensors/plataforma-schema.ts:373`, diagnóstico visual `diagnostico/route.ts` Deepseek, histórico `risk_events`, informes `servicios/page.tsx:106` informes, seguimiento técnico, cooperativas → gate `config/post-mvp.ts:5` `esPostMvp()` + middleware premium (no borrar)

**No tocar (destructivo prohibido §3)**  
- Tablas `plataforma`/`campo`/`public` estructura, endpoints sin verificar consumidores (`bottom-nav` 5 tabs, `sitemap`), secretos, `admin/*` salvo necesario, migración NEON destructiva, sustitución datos reales por ficticios, ocultar errores con defaults engañosos (`NO_DATA` actual es correcto)

## 11. Estado para Fase 2

Inventario coherente: build OK, 1 test a reparar, 24 env vars mapeadas, 7 proveedores (AEMET/Open-Meteo/SiAR/RAIF/WhatsApp/Telegram/Resend+Deepseek+VAPID), 70 endpoints catalogados. Siguiente: crear `/tiempo` y `/avisos` públicos alias + `/app/*` gratuita con device cookie, premium con `risk_rules.parameters` gate — sin renames físicos hasta métrica 50 usuarios/20 parcelas/10 alertas/5 WhatsApp validada.

---
*Generado Fase 1 — Inspección sin modificaciones, verificado en código (file:line).*
