import { NextResponse } from "next/server";
import { listarLeadEvents } from "@/lib/datos/lead-events-repo";
import { registrarEventoLead } from "@/lib/aplicacion/lead-events";
import { leadEventoValido } from "@/lib/datos/validacion";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.lead-events");

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const cuerpo = (await req.json().catch(() => null)) as unknown;
  if (!leadEventoValido(cuerpo)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }
  if (!cuerpo.anonymousId && !cuerpo.userId) {
    return NextResponse.json(
      { error: "Falta anonymousId o userId." },
      { status: 400 },
    );
  }

  return conRequestId(
    { user_id: cuerpo.anonymousId ?? cuerpo.userId, plot_id: cuerpo.plotId },
    async (requestId) => {
      const inicio = Date.now();
      try {
        const { id, points } = await registrarEventoLead({
          userId: cuerpo.userId ?? null,
          anonymousId: cuerpo.anonymousId ?? null,
          plotId: cuerpo.plotId ?? null,
          eventType: cuerpo.eventType,
          metadata: cuerpo.metadata,
        });
        log.info("lead-events.crear.ok", {
          status: 201,
          duracion_ms: Date.now() - inicio,
          data: { eventType: cuerpo.eventType, points },
        });
        return conCabeceraRequestId(
          NextResponse.json({ id, points }, { status: 201 }),
          requestId,
        );
      } catch (error) {
        log.error(
          "lead-events.crear.error",
          { status: 503, duracion_ms: Date.now() - inicio },
          error,
        );
        return conCabeceraRequestId(
          NextResponse.json(
            { error: "No se pudo registrar el evento ahora." },
            { status: 503 },
          ),
          requestId,
        );
      }
    },
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  return conRequestId({ external_source: "lead-events" }, async (requestId) => {
    const inicio = Date.now();
    try {
      const eventos = await listarLeadEvents({
        anonymousId: url.searchParams.get("anonymousId") ?? undefined,
        userId: url.searchParams.get("userId") ?? undefined,
        plotId: url.searchParams.get("plotId") ?? undefined,
        eventType: url.searchParams.get("eventType") ?? undefined,
      });
      log.info("lead-events.listar.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
        data: { total: eventos.length },
      });
      return conCabeceraRequestId(NextResponse.json(eventos), requestId);
    } catch (error) {
      log.error(
        "lead-events.listar.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudieron cargar los eventos." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}
