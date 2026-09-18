import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ejecutarBarrido } from "@/lib/aplicacion/barrido";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.worker.alertas");

export const dynamic = "force-dynamic";

function secretosIguales(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

async function ejecutar(req: Request) {
  const secretoEsperado = process.env.WORKER_SECRET;
  if (!secretoEsperado) {
    return NextResponse.json(
      { error: "Worker no configurado (falta WORKER_SECRET)." },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const autorizacion = req.headers.get("authorization") ?? "";
  const bearer = autorizacion.toLowerCase().startsWith("bearer ")
    ? autorizacion.slice(7)
    : "";
  const secreto =
    req.headers.get("x-worker-secret") ||
    bearer ||
    url.searchParams.get("secreto") ||
    "";
  if (!secretosIguales(secreto, secretoEsperado)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const dryRun =
    url.searchParams.get("dryRun") === "1" ||
    url.searchParams.get("dryRun") === "true";

  return conRequestId({ external_source: "worker" }, async (requestId) => {
    const inicio = Date.now();
    try {
      const resumen = await ejecutarBarrido({ dryRun });
      log.info("worker.alertas.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
        data: { ...resumen },
      });
      return conCabeceraRequestId(NextResponse.json(resumen), requestId);
    } catch (error) {
      log.error(
        "worker.alertas.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudo ejecutar el worker ahora." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}

export const POST = ejecutar;
export const GET = ejecutar;
