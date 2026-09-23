import { NextResponse } from "next/server";
import { z } from "zod";
import { activarSuscripcionWhatsapp } from "@/lib/datos/avisos-repo";
import { obtenerOCrearParcela } from "@/lib/datos/parcelas-repo";
import { exigirDispositivo } from "@/lib/datos/sesion-dispositivo";
import { catalogoCultivos } from "@/lib/cultivos/catalogo";
import type { CulturaId } from "@/lib/cultivos/catalogo";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";
import { registrarSenalSegura } from "@/lib/aplicacion/crm";
import { VERSION_CONSENTIMIENTO } from "@/lib/privacidad/consentimiento";

const log = crearLogger("api.avisos.activar-gratis");
const idsCultivos = Object.keys(catalogoCultivos) as [CulturaId, ...CulturaId[]];

const esquema = z.object({
  dispositivoId: z.string().trim().min(1).max(128),
  nombre: z.string().trim().min(1).max(80),
  cultivo: z.enum(idsCultivos),
  latitud: z.number().finite().gte(-90).lte(90),
  longitud: z.number().finite().gte(-180).lte(180),
  telefono: z.string().trim()
    .transform((valor) => valor.replace(/[\s().-]/g, "").replace(/^0034/, "+34"))
    .refine((valor) => /^(?:\+34)?[6789]\d{8}$/.test(valor)),
  aceptaAvisos: z.literal(true),
});

function telefonoWhatsapp(valor: string): string {
  const limpio = valor.replace(/[\s().-]/g, "").replace(/^0034/, "+34");
  return limpio.startsWith("+") ? limpio : `+34${limpio}`;
}

export async function POST(req: Request) {
  const parsed = esquema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de activación no válidos." }, { status: 400 });
  }
  const datos = parsed.data;
  const identidad = exigirDispositivo(req, datos.dispositivoId);
  if (!identidad.ok) return NextResponse.json({ error: identidad.error }, { status: identidad.status });

  const limite = rateLimit(`avisos-gratis:${identidad.dispositivoId}`, 5, 60 * 60_000);
  if (!limite.ok) {
    return NextResponse.json({ error: "Has realizado varias activaciones. Inténtalo más tarde." }, {
      status: 429,
      headers: rateLimitResponse(limite.remaining, limite.resetAt),
    });
  }

  return conRequestId({ user_id: identidad.dispositivoId }, async (requestId) => {
    const inicio = Date.now();
    try {
      const parcela = await obtenerOCrearParcela({
        dispositivoId: identidad.dispositivoId,
        nombre: datos.nombre,
        cultivo: datos.cultivo,
        latitud: datos.latitud,
        longitud: datos.longitud,
      });
      const suscripcion = await activarSuscripcionWhatsapp({
        dispositivoId: identidad.dispositivoId,
        parcelaId: parcela.id,
        destino: telefonoWhatsapp(datos.telefono),
      });
      await registrarSenalSegura({
        dispositivoId: identidad.dispositivoId,
        evento: "avisos_activados",
        source: "alta_gratuita_whatsapp",
        cropType: datos.cultivo,
        metadata: {
          parcelaId: parcela.id,
          canal: "whatsapp",
          consentimiento: { aceptado: true, version: VERSION_CONSENTIMIENTO, aceptadoEn: new Date().toISOString() },
        },
      });
      log.info("avisos.activar-gratis.ok", {
        status: 201,
        duracion_ms: Date.now() - inicio,
        plot_id: parcela.id,
        external_source: "whatsapp",
      });
      return conCabeceraRequestId(NextResponse.json({ activada: true, parcelaId: parcela.id, suscripcionId: suscripcion.id }, { status: 201 }), requestId);
    } catch (error) {
      log.error("avisos.activar-gratis.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudieron activar los avisos ahora. Vuelve a intentarlo." }, { status: 503 }), requestId);
    }
  });
}
