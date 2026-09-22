# Métricas MVP — TecRural Campo

> Fase 9 — analítica mínima accionable. No priorizar visitas totales, páginas vistas, usuarios acumulados, impresiones sin contexto.

## Eventos implementados (`src/lib/analitica.ts:8`)

| Evento | Cuándo | Lead mapping |
|---|---|---|
| `municipality_selected` | elige Altiplano/Costa + municipio `home-sin-registro.tsx:55` | `LOCATION_SELECTED` |
| `crop_selected` | elige cultivo (incl. Otro) `home-sin-registro.tsx:78` | `CROP_SELECTED` |
| `weather_viewed` | `MeteoZona` carga `current` ok `meteo-zona.tsx:85` | — |
| `forecast_viewed` | `MeteoZona` carga `forecast` 5d ok | — |
| `frost_alert_viewed` | `BloqueValorAgricola` helada con severidad `bloque-valor-agricola.tsx:66` | `ALERT_OPENED` |
| `wind_alert_viewed` | idem viento | `ALERT_OPENED` |
| `lead_form_started` | focus nombre `formulario-contacto.tsx:47` | — |
| `lead_form_submitted` | POST `/api/contacto` 201 `formulario-contacto.tsx:84` | `CONTACT_REQUESTED` |
| `lead_form_error` | validación `Datos incompletos` o `Error temporal` `formulario-contacto.tsx:71` | — |
| `whatsapp_clicked` | CTA `Recibir avisos de mi zona` header/portada `header.tsx:6` | `CONTACT_REQUESTED` |
| `premium_feature_locked` | gate `diagnostico` 403 `diagnostico/route.ts:14` o UI `requiresPlan` | — |

Vercel Analytics `track()` + `POST /api/v1/events` scoring anónimo `analitica.ts:36`.

## Embudo MVP (indicadores)

1. **Visitantes → selección municipio**: `municipality_selected / visitantes`
2. **Selección municipio → consulta meteorológica**: `weather_viewed / municipality_selected` (y `forecast_viewed`)
3. **Consulta meteorológica → formulario iniciado**: `lead_form_started / weather_viewed`
4. **Formulario iniciado → lead enviado**: `lead_form_submitted / lead_form_started` (error rate `lead_form_error`)
5. **Lead enviado → WhatsApp respondido**: `whatsapp_clicked` o `telegram_notification_sent` servidor `contacto/route.ts:162` / CRM `CONTACT_REQUESTED`
6. **Lead → activación**: `POST /api/contacto` 201 con `contacto.ok` log + `lead_scores` (usuario→lead templado/caliente `dominio/lead-scores.ts`)
7. **Activación → uso recurrente**: `weather_viewed` + `frost/wind_alert_viewed` repetidos por mismo `dispositivoId` en 7d
8. **Gratuito → suscripción**: `premium_feature_locked` con `requiresPlan` → conversión a `essential|monitor|pro` (flag `NEXT_PUBLIC_ENABLE_*`)

## No priorizar

- visitas totales, páginas vistas, usuarios acumulados, impresiones sin contexto — vanity, no accionables.

## Medición

- Cliente: `track(evento, {municipio, cultivo, origen})` + server `POST /api/v1/events` con `anonymousId`.
- Servidor: logs estructurados `contacto.ok {score, duplicada}` y `riesgo.evaluar.*`.
- Dashboard: contar funnel diario en `plataforma.lead_events` y `lead_scores`.
