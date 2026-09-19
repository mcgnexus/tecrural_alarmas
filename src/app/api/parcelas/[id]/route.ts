import { NextResponse } from "next/server";
import { eliminarParcela } from "@/lib/datos/parcelas-repo";
import { exigirDispositivo } from "@/lib/datos/sesion-dispositivo";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.parcelas.eliminar");

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const dispositivo = url.searchParams.get("dispositivo");
  const identidad = exigirDispositivo(req, dispositivo);
  if (!identidad.ok) {
    return NextResponse.json({ error: identidad.error }, { status: identidad.status });
  }
  const idDispositivo = identidad.dispositivoId;

  return conRequestId(
    { user_id: idDispositivo, plot_id: id },
    async (requestId) => {
      const inicio = Date.now();
      try {
        const eliminada = await eliminarParcela(id, idDispositivo);
        if (!eliminada) {
          log.warn("parcelas.eliminar.no_encontrada", {
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
        log.info("parcelas.eliminar.ok", {
          status: 200,
          duracion_ms: Date.now() - inicio,
        });
        return conCabeceraRequestId(NextResponse.json({ ok: true }), requestId);
      } catch (error) {
        log.error(
          "parcelas.eliminar.error",
          { status: 503, duracion_ms: Date.now() - inicio },
          error,
        );
        return conCabeceraRequestId(
          NextResponse.json(
            { error: "No se pudo eliminar la parcela ahora." },
            { status: 503 },
          ),
          requestId,
        );
      }
    },
  );
}
