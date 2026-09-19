import { NextResponse } from "next/server";
import { evaluarYGuardarParcela } from "@/lib/aplicacion/evaluacion";
import { dispositivoValido } from "@/lib/datos/validacion";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.parcelas.evaluar");

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const cuerpo = (await req.json().catch(() => null)) as unknown;
  const dispositivo = esCuerpoDispositivo(cuerpo) ? cuerpo.dispositivoId : null;
  const fenofaseId = typeof (cuerpo as Record<string, unknown>)?.fenofaseId === "string" ? ((cuerpo as Record<string, unknown>).fenofaseId as string) : undefined;
  if (!dispositivoValido(dispositivo)) {
    return NextResponse.json(
      { error: "Falta el identificador de dispositivo." },
      { status: 400 },
    );
  }

  return conRequestId(
    { user_id: dispositivo, plot_id: id },
    async (requestId) => {
      const inicio = Date.now();
      try {
        const resultado = await evaluarYGuardarParcela(id, dispositivo, fenofaseId);
        // resultado nunca es GREEN por error; GREEN es level green explícito, NO_DATA nunca
        if (!resultado) throw new Error("NO_DATA");
        log.info("parcelas.evaluar.ok", {
          status: 200,
          duracion_ms: Date.now() - inicio,
          external_source: resultado.fuente.id,
        });
        return conCabeceraRequestId(NextResponse.json(resultado), requestId);
      } catch (error) {
        if (error instanceof Error && error.message === "Parcela no encontrada") {
          log.warn("parcelas.evaluar.no_encontrada", {
            status: 404,
            duracion_ms: Date.now() - inicio,
          });
          return conCabeceraRequestId(
            NextResponse.json(
              { error: "Parcela no encontrada." },
              { status: 404 },
            ),
            requestId,
          );
        }
        if (error instanceof Error && error.message === "No autorizado") {
          log.warn("parcelas.evaluar.no_autorizado", {
            status: 403,
            duracion_ms: Date.now() - inicio,
          });
          return conCabeceraRequestId(
            NextResponse.json(
              { error: "No autorizado para esta parcela." },
              { status: 403 },
            ),
            requestId,
          );
        }
        const esNoData =
          error instanceof Error &&
          ((error as unknown as Record<string, unknown>).code === "NO_DATA" ||
            error.message.includes("NO_DATA") ||
            error.message.includes("Datos temporalmente"));
        log.error(
          "parcelas.evaluar.error",
          { status: 503, duracion_ms: Date.now() - inicio },
          error,
        );
        return conCabeceraRequestId(
          NextResponse.json(
            esNoData
              ? { error: "Datos temporalmente no disponibles", code: "NO_DATA" }
              : { error: "No se pudo evaluar el riesgo ahora." },
            { status: 503 },
          ),
          requestId,
        );
      }
    },
  );
}

function esCuerpoDispositivo(dato: unknown): dato is { dispositivoId: string } {
  return (
    typeof dato === "object" &&
    dato !== null &&
    typeof (dato as Record<string, unknown>).dispositivoId === "string"
  );
}
