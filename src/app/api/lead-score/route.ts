import { NextResponse } from "next/server";
import {
  obtenerLeadScoreUsuario,
  puntajeAnonimo,
} from "@/lib/datos/lead-scores-repo";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.lead-score");

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const anonymousId = url.searchParams.get("anonymousId");
  if (!userId && !anonymousId) {
    return NextResponse.json(
      { error: "Indica userId o anonymousId." },
      { status: 400 },
    );
  }

  return conRequestId(
    { user_id: anonymousId ?? userId ?? undefined, external_source: "lead-score" },
    async (requestId) => {
      const inicio = Date.now();
      try {
        const resultado = userId
          ? ((await obtenerLeadScoreUsuario(userId)) ?? {
              userId,
              score: 0,
              classification: "usuario",
              lastActivityAt: null,
              updatedAt: new Date().toISOString(),
            })
          : await puntajeAnonimo(anonymousId as string);

        log.info("lead-score.ok", {
          status: 200,
          duracion_ms: Date.now() - inicio,
          data: { score: resultado.score, classification: resultado.classification },
        });
        return conCabeceraRequestId(NextResponse.json(resultado), requestId);
      } catch (error) {
        log.error(
          "lead-score.error",
          { status: 503, duracion_ms: Date.now() - inicio },
          error,
        );
        return conCabeceraRequestId(
          NextResponse.json(
            { error: "No se pudo calcular la puntuación ahora." },
            { status: 503 },
          ),
          requestId,
        );
      }
    },
  );
}
