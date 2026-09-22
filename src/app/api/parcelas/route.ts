import { NextResponse } from "next/server";
import { crearParcela, listarParcelas } from "@/lib/datos/parcelas-repo";
import { cuerpoParcelaValido } from "@/lib/datos/validacion";
import { exigirDispositivo } from "@/lib/datos/sesion-dispositivo";
import { usuarioAutenticado } from "@/lib/datos/sesion-usuario";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";
import { registrarSenalSegura } from "@/lib/aplicacion/crm";
import { evaluarYGuardarParcela } from "@/lib/aplicacion/evaluacion";
import type { ParcelaDto } from "@/lib/datos/tipos";
import { verificarAccesoAdmin } from "@/lib/admin/auth";

const log = crearLogger("api.parcelas");

export const dynamic = "force-dynamic";

/** Antigüedad (min) a partir de la cual la evaluación se considera caducada. */
const MAX_MINUTOS_EVALUACION = 90;
/** Máximo de re-evaluaciones por petición para acotar la latencia. */
const MAX_REFRESCOS = 5;

function evaluacionCaducada(parcela: ParcelaDto): boolean {
  if (!parcela.ultimaEvaluacion) return true;
  const minutos = (Date.now() - Date.parse(parcela.ultimaEvaluacion.evaluadoEl)) / 60000;
  return !(Number.isFinite(minutos) && minutos < MAX_MINUTOS_EVALUACION);
}

/**
 * Re-evalúa las parcelas con evaluación caducada o inexistente para que el
 * agricultor vea siempre datos recientes al abrir la página. Si una
 * re-evaluación falla (p. ej. NO_DATA) se conserva la evaluación previa.
 */
async function refrescarCaducadas(
  parcelas: ParcelaDto[],
  dispositivoId: string,
): Promise<{ parcelas: ParcelaDto[]; refrescadas: number }> {
  const caducadas = parcelas.filter(evaluacionCaducada).slice(0, MAX_REFRESCOS);
  let refrescadas = 0;
  for (const parcela of caducadas) {
    try {
      const resultado = await evaluarYGuardarParcela(parcela.id, dispositivoId);
      parcela.ultimaEvaluacion = resultado;
      refrescadas += 1;
    } catch (error) {
      log.warn("parcelas.listar.refresco.error", { plot_id: parcela.id }, error);
    }
  }
  return { parcelas, refrescadas };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dispositivo = url.searchParams.get("dispositivo");
  const admin = await verificarAccesoAdmin(req);
  const identidad = admin.ok ? { ok: true as const, dispositivoId: "admin" } : exigirDispositivo(req, dispositivo);
  if (!identidad.ok) {
    return NextResponse.json({ error: identidad.error }, { status: identidad.status });
  }
  const idDispositivo = identidad.dispositivoId;
  const userId = usuarioAutenticado(req);

  return conRequestId({ user_id: userId ?? idDispositivo }, async (requestId) => {
    const inicio = Date.now();
    try {
      const listadas = await listarParcelas(admin.ok ? null : idDispositivo, admin.ok ? null : userId);
      const { parcelas, refrescadas } = await refrescarCaducadas(listadas, idDispositivo);
      log.info("parcelas.listar.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
        data: { total: parcelas.length, refrescadas },
      });
      return conCabeceraRequestId(NextResponse.json(parcelas), requestId);
    } catch (error) {
      log.error(
        "parcelas.listar.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudieron cargar las parcelas ahora." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}

export async function POST(req: Request) {
  const cuerpo = (await req.json().catch(() => null)) as unknown;
  if (!cuerpoParcelaValido(cuerpo)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }
  const admin = await verificarAccesoAdmin(req);
  const identidad = admin.ok ? { ok: true as const, dispositivoId: "admin" } : exigirDispositivo(req, cuerpo.dispositivoId);
  if (!identidad.ok) {
    return NextResponse.json({ error: identidad.error }, { status: identidad.status });
  }
  const idDispositivo = identidad.dispositivoId;
  const userId = admin.ok ? null : usuarioAutenticado(req);

  return conRequestId({ user_id: userId ?? idDispositivo }, async (requestId) => {
    const inicio = Date.now();
    try {
      const parcela = await crearParcela({
        dispositivoId: idDispositivo,
        userId,
        nombre: cuerpo.nombre,
        cultivo: cuerpo.cultivo,
        latitud: cuerpo.latitud,
        longitud: cuerpo.longitud,
      });
      log.info("parcelas.crear.ok", {
        status: 201,
        duracion_ms: Date.now() - inicio,
        plot_id: parcela.id,
      });
      await registrarSenalSegura({
        dispositivoId: idDispositivo,
        evento: "parcela_anadida",
        cropType: cuerpo.cultivo,
      });
      return conCabeceraRequestId(
        NextResponse.json(parcela, { status: 201 }),
        requestId,
      );
    } catch (error) {
      log.error(
        "parcelas.crear.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudo guardar la parcela ahora." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}
