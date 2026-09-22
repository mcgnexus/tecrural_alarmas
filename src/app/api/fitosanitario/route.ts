import { NextResponse } from "next/server";
import { listarAvisosFitosanitariosOficiales } from "@/lib/aplicacion/fitosanitario";
import { metadatosFitosanitarios } from "@/lib/datos/fitosanitario-repo";
import { proveedorRaif } from "@/lib/proveedores/raif";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";
import { verificarAccesoAdmin } from "@/lib/admin/auth";

const log = crearLogger("api.fitosanitario");

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cropId = url.searchParams.get("cropId") ?? undefined;
  const province = url.searchParams.get("province") ?? undefined;
  const municipality = url.searchParams.get("municipality") ?? undefined;
  const region = url.searchParams.get("region") ?? undefined;
  const pest = url.searchParams.get("pest") ?? undefined;
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50) || 50, 1), 100);
  const accesoAdmin = await verificarAccesoAdmin(req);
  const esAdmin = accesoAdmin.ok;
  if (!esAdmin && !province && !municipality && !cropId && !region) {
    return NextResponse.json({ disponible: false, avisos: [], total: 0 });
  }

  return conRequestId({ external_source: "fitosanitario" }, async (requestId) => {
    const inicio = Date.now();
    try {
      const [avisos, metadatos] = await Promise.all([
        listarAvisosFitosanitariosOficiales({ cropId, province, municipality, region, pest, from, to, limit }),
        metadatosFitosanitarios(),
      ]);
      log.info("fitosanitario.listar.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
        data: { total: avisos.length },
      });
      return conCabeceraRequestId(
        NextResponse.json({
          disponible: proveedorRaif.configurado() && Boolean(metadatos.ultimaIngesta),
          estadoDisponibilidad: proveedorRaif.configurado() && metadatos.ultimaIngesta ? "disponible" : "sin_ingesta",
          ultimaIngesta: metadatos.ultimaIngesta,
          boletinMasReciente: metadatos.boletinMasReciente,
          fuente: "RAIF / Junta de Andalucía",
          avisos: esAdmin ? avisos : avisos.map((aviso) => {
            const publico: Partial<typeof aviso> = { ...aviso };
            delete publico.paginaFuente;
            delete publico.estadoExtraccion;
            delete publico.confianzaExtraccion;
            return publico;
          }),
        }),
        requestId,
      );
    } catch (error) {
      log.error(
        "fitosanitario.listar.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudieron cargar los avisos fitosanitarios." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}
