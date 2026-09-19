import { NextResponse } from "next/server";
import { isNotNull } from "drizzle-orm";
import { obtenerDb } from "@/lib/datos/db";
import { parcelasPlataforma } from "@/lib/datos/plataforma-schema";
import { obtenerClimaPunto } from "@/lib/clima/motor";
import { verificarAccesoInterno } from "@/lib/internal/auth";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.internal.weather.refresh");
export const dynamic = "force-dynamic";

async function handler(req: Request) {
  const auth = verificarAccesoInterno(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  return conRequestId({ external_source: "internal" }, async (requestId) => {
    const inicio = Date.now();
    try {
      let body: unknown = null;
      try { body = await req.clone().json(); } catch { body = null; }
      const b = (body ?? {}) as { lat?: number; lon?: number; latitude?: number; longitude?: number };

      const lat = typeof b.lat === "number" ? b.lat : typeof b.latitude === "number" ? b.latitude : null;
      const lon = typeof b.lon === "number" ? b.lon : typeof b.longitude === "number" ? b.longitude : null;

      if (lat !== null && lon !== null) {
        const punto = await obtenerClimaPunto(lat, lon);
        log.info("internal.weather.refresh.ok", { status: 200, duracion_ms: Date.now() - inicio, data: { single: true, fuente: punto.fuente.id } });
        return conCabeceraRequestId(NextResponse.json({ refreshed: 1, errors: 0, fuente: punto.fuente.id }), requestId);
      }

      const db = obtenerDb();
      const parcelas = await db
        .select({ latitude: parcelasPlataforma.latitude, longitude: parcelasPlataforma.longitude })
        .from(parcelasPlataforma)
        .where(isNotNull(parcelasPlataforma.latitude));

      const unicos = new Map<string, { lat: number; lon: number }>();
      for (const p of parcelas) {
        if (p.latitude === null || p.longitude === null) continue;
        const key = `${p.latitude.toFixed(2)}:${p.longitude.toFixed(2)}`;
        if (!unicos.has(key)) unicos.set(key, { lat: p.latitude, lon: p.longitude });
      }

      let refreshed = 0;
      let errors = 0;
      for (const { lat: la, lon: lo } of unicos.values()) {
        try {
          await obtenerClimaPunto(la, lo);
          refreshed += 1;
        } catch (e) {
          errors += 1;
          log.warn("internal.weather.refresh.item.error", { external_source: "open-meteo" }, e);
        }
      }

      log.info("internal.weather.refresh.ok", { status: 200, duracion_ms: Date.now() - inicio, data: { refreshed, errors, total: unicos.size } });
      return conCabeceraRequestId(NextResponse.json({ refreshed, errors, total: unicos.size }), requestId);
    } catch (error) {
      log.error("internal.weather.refresh.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo refrescar el tiempo." }, { status: 503 }), requestId);
    }
  });
}

export const POST = handler;
