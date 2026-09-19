import { NextResponse } from "next/server";
import { ejecutarPhytosanitaryRefresh } from "@/lib/cron/phytosanitary-refresh";
import { verificarAccesoInterno } from "@/lib/internal/auth";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.cron.phytosanitary-refresh");
export const dynamic = "force-dynamic";

async function handler(req: Request) {
  const auth = verificarAccesoInterno(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return conRequestId({ external_source: "cron" }, async (requestId) => {
    const inicio = Date.now();
    try {
      const res = await ejecutarPhytosanitaryRefresh();
      log.info("cron.phytosanitary-refresh.ok", { status: 200, duracion_ms: Date.now() - inicio, data: res as unknown as Record<string, unknown> });
      return conCabeceraRequestId(NextResponse.json(res), requestId);
    } catch (e) {
      log.error("cron.phytosanitary-refresh.error", { status: 503, duracion_ms: Date.now() - inicio }, e);
      return conCabeceraRequestId(NextResponse.json({ error: "Error en phytosanitary-refresh" }, { status: 503 }), requestId);
    }
  });
}
export const GET = handler;
export const POST = handler;
