import { NextResponse } from "next/server";
import {
  crearReglaRiesgo,
  listarReglasRiesgo,
} from "@/lib/datos/reglas-repo";
import { reglaRiesgoValida } from "@/lib/datos/validacion";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";
import { verificarAccesoAdmin } from "@/lib/admin/auth";

const log = crearLogger("api.reglas");

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const riskType = url.searchParams.get("riskType") ?? undefined;
  const cropId = url.searchParams.get("cropId") ?? undefined;
  const todas = url.searchParams.get("todas") === "1";

  return conRequestId({ external_source: "reglas" }, async (requestId) => {
    const inicio = Date.now();
    try {
      const reglas = await listarReglasRiesgo({
        enabled: todas ? undefined : true,
        riskType,
        cropId,
      });
      log.info("reglas.listar.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
        data: { total: reglas.length },
      });
      return conCabeceraRequestId(NextResponse.json(reglas), requestId);
    } catch (error) {
      log.error(
        "reglas.listar.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudieron cargar las reglas." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}

export async function POST(req: Request) {
  const acceso = verificarAccesoAdmin(req);
  if (!acceso.ok) return NextResponse.json({ error: acceso.error }, { status: acceso.status });
  const cuerpo = (await req.json().catch(() => null)) as unknown;
  if (!reglaRiesgoValida(cuerpo)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  return conRequestId({ external_source: "reglas" }, async (requestId) => {
    const inicio = Date.now();
    try {
      const regla = await crearReglaRiesgo({
        code: cuerpo.code,
        riskType: cuerpo.riskType,
        name: cuerpo.name,
        description: cuerpo.description,
        cropId: cuerpo.cropId ?? null,
        phenologicalStateId: cuerpo.phenologicalStateId ?? null,
        parameters: cuerpo.parameters,
        enabled: cuerpo.enabled,
        version: cuerpo.version,
      });
      log.info("reglas.crear.ok", {
        status: 201,
        duracion_ms: Date.now() - inicio,
        data: { code: regla.code },
      });
      return conCabeceraRequestId(
        NextResponse.json(regla, { status: 201 }),
        requestId,
      );
    } catch (error) {
      log.error(
        "reglas.crear.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudo crear la regla (¿código duplicado?)." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}
