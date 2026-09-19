import { NextResponse } from "next/server";
import { evaluarPlotPlataforma } from "@/lib/aplicacion/riesgo-plataforma";
import { listarEventosRiesgo } from "@/lib/datos/eventos-riesgo-repo";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.plataforma.plot.riesgo");

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  return conRequestId({ plot_id: id }, async (requestId) => {
    const inicio = Date.now();
    try {
      const resultado = await evaluarPlotPlataforma(id);
      log.info("plataforma.plot.riesgo.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
        data: { eventos: resultado.eventos.length },
      });
      return conCabeceraRequestId(NextResponse.json(resultado), requestId);
    } catch (error) {
      const noEncontrada =
        error instanceof Error &&
        (error.message === "Parcela no encontrada" ||
          error.message === "Cultivo no soportado" ||
          error.message === "Parcela sin coordenadas");
      const esNoData =
        error instanceof Error &&
        ((error as unknown as Record<string, unknown>).code === "NO_DATA" ||
          error.message.includes("NO_DATA") ||
          error.message.includes("Datos temporalmente"));
      log.error(
        "plataforma.plot.riesgo.error",
        { status: noEncontrada ? 404 : esNoData ? 503 : 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          noEncontrada
            ? { error: "Parcela no encontrada o no evaluable." }
            : esNoData
              ? { error: "Datos temporalmente no disponibles", code: "NO_DATA" }
              : { error: "No se pudo evaluar el riesgo ahora." },
          { status: noEncontrada ? 404 : 503 },
        ),
        requestId,
      );
    }
  });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  return conRequestId({ plot_id: id }, async (requestId) => {
    const inicio = Date.now();
    try {
      const eventos = await listarEventosRiesgo({ plotId: id, limite: 100 });
      log.info("plataforma.plot.riesgo.listar.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
        data: { eventos: eventos.length },
      });
      return conCabeceraRequestId(NextResponse.json(eventos), requestId);
    } catch (error) {
      log.error(
        "plataforma.plot.riesgo.listar.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudieron cargar los eventos de riesgo." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}
