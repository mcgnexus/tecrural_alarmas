import { NextResponse } from "next/server";
import { z } from "zod";
import { actualizarContactoLead } from "@/lib/datos/crm-repo";
import { obtenerLeadPorVisitante } from "@/lib/datos/crm-repo";
import { registrarSenal } from "@/lib/aplicacion/crm";
import { notificarSolicitudContacto } from "@/lib/notificaciones/aviso-negocio";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.contacto");
export const dynamic = "force-dynamic";

const esquema = z.object({
  dispositivoId: z.string().trim().min(1).max(128),
  nombre: z.string().trim().min(2).max(80),
  telefono: z
    .string()
    .trim()
    .regex(/^\+?[\d\s().-]{9,20}$/, "Teléfono no válido"),
  municipio: z.string().trim().min(1).max(80),
  tipoExplotacion: z.enum(["agricultura", "ganaderia", "mixta"]),
  problema: z.string().trim().min(1).max(80),
  servicioKey: z.string().trim().max(80).optional(),
  servicioNombre: z.string().trim().max(120).optional(),
  interes: z.enum(["SENSORS", "WEATHER_STATION", "AI_DIAGNOSIS", "IRRIGATION", "REPORTS"]).optional(),
  aceptaPrivacidad: z.literal(true),
});

/**
 * Solicitud de contacto comercial: guarda nombre y teléfono en el lead del CRM
 * (además de registrar la señal de scoring) para que el equipo pueda llamar.
 */
export async function POST(req: Request) {
  const cuerpo = (await req.json().catch(() => null)) as unknown;
  const parsed = esquema.safeParse(cuerpo);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });
  }

  const datos = parsed.data;
  return conRequestId({ user_id: datos.dispositivoId }, async (requestId) => {
    const inicio = Date.now();
    try {
      // Señal CRM: scoring + evento de solicitud de información.
      const resumen = await registrarSenal({
        dispositivoId: datos.dispositivoId,
        evento: "solicitar_informacion",
        intereses: datos.interes ? [datos.interes] : undefined,
        serviceKey: datos.servicioKey,
        source: "formulario_contacto",
        metadata: {
          servicioKey: datos.servicioKey ?? null,
          servicioNombre: datos.servicioNombre ?? null,
          municipio: datos.municipio,
          tipoExplotacion: datos.tipoExplotacion,
          problema: datos.problema,
        },
      });

      // Datos de contacto reales sobre el lead (si existe).
      const lead = await obtenerLeadPorVisitante(datos.dispositivoId);
      if (lead) {
        await actualizarContactoLead(lead.id, {
          nombre: datos.nombre,
          telefono: datos.telefono,
          comentario: [
            datos.servicioNombre ? `Servicio: ${datos.servicioNombre}` : null,
            `Problema: ${datos.problema}`,
            `Municipio: ${datos.municipio}`,
            `Explotación: ${datos.tipoExplotacion}`,
          ]
            .filter(Boolean)
            .join(" — "),
        });
      }

      // Aviso inmediato al equipo por Telegram (nunca rompe el flujo).
      await notificarSolicitudContacto({
        nombre: datos.nombre,
        telefono: datos.telefono,
        mensaje: `📍 ${datos.municipio} · ${datos.tipoExplotacion} · ${datos.problema}`,
        servicioNombre: datos.servicioNombre,
      });

      log.info("contacto.ok", {
        status: 201,
        duracion_ms: Date.now() - inicio,
        data: { servicioKey: datos.servicioKey ?? null, score: resumen.score },
      });
      return conCabeceraRequestId(
        NextResponse.json({ ok: true }, { status: 201 }),
        requestId,
      );
    } catch (error) {
      log.error(
        "contacto.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudo enviar la solicitud ahora. Inténtalo de nuevo." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}
