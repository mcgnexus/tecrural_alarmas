import { NextResponse } from "next/server";
import { eliminarParcela } from "@/lib/datos/parcelas-repo";
import { dispositivoValido } from "@/lib/datos/validacion";
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
        const eliminada = await eliminarParcela(id, dispositivo);
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
