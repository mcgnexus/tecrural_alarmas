import { NextResponse } from "next/server";
import { guardarAvisosOficiales } from "@/lib/datos/alertas-oficiales-repo";
import { verificarAccesoInterno } from "@/lib/internal/auth";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";
import { proveedorRaif } from "@/lib/proveedores/raif";

const log = crearLogger("api.internal.raif.refresh");
export const dynamic = "force-dynamic";

async function handler(req: Request) {
  const auth = verificarAccesoInterno(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  return conRequestId({ external_source: "raif" }, async (requestId) => {
    const inicio = Date.now();
    try {
      if (!proveedorRaif.configurado()) {
        log.warn("internal.raif.no_configurado", { status: 200, duracion_ms: Date.now() - inicio });
        return conCabeceraRequestId(NextResponse.json({ refreshed: 0, message: "RAIF no configurado (falta RAIF_FEED_URL)." }), requestId);
      }

      if (!proveedorRaif.getWarnings) {
        return conCabeceraRequestId(NextResponse.json({ refreshed: 0, message: "RAIF sin soporte de avisos." }), requestId);
      }
      const avisos = await proveedorRaif.getWarnings({ latitud: 37.5, longitud: -2.5 });
      const guardados = avisos.length > 0 ? await guardarAvisosOficiales(avisos) : 0;

      log.info("internal.raif.refresh.ok", { status: 200, duracion_ms: Date.now() - inicio, data: { fetched: avisos.length, saved: guardados } });
      return conCabeceraRequestId(NextResponse.json({ fetched: avisos.length, saved: guardados, refreshed: guardados }), requestId);
    } catch (error) {
      log.error("internal.raif.refresh.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo refrescar RAIF." }, { status: 503 }), requestId);
    }
  });
}

export const POST = handler;
