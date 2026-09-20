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
  origen: z.enum(["formulario", "asistente"]).optional(),
  aceptaPrivacidad: z.literal(true),
});

/** Interés de plan probable según el problema declarado en el asistente. */
function interesProbableDesdeProblema(problema: string): string {
  const p = problema.toLowerCase();
  if (p.includes("helada")) return "Monitor";
  if (p.includes("riego") || p.includes("agua")) return "Monitor";
  if (p.includes("plaga") || p.includes("enfermedad")) return "Pro";
  if (p.includes("calor") || p.includes("termico") || p.includes("término")) return "Monitor";
  if (p.includes("tiempo") || p.includes("meteorolog")) return "Monitor";
  if (p.includes("sensor")) return "Pro";
  return "Esencial";
}

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
      const enviado = await notificarSolicitudContacto({
        nombre: datos.nombre,
        telefono: datos.telefono,
        mensaje: datos.origen === "asistente" ? datos.problema : `📍 ${datos.municipio} · ${datos.tipoExplotacion} · ${datos.problema}`,
        servicioNombre: datos.servicioNombre,
        origen: datos.origen,
        perfil: datos.tipoExplotacion,
        municipio: datos.municipio,
        interesProbable: datos.origen === "asistente" ? interesProbableDesdeProblema(datos.problema) : undefined,
      });
      if (enviado) {
        // Evento del embudo comercial (lado servidor, log estructurado).
        log.info("telegram_notification_sent", {
          external_source: "telegram",
          data: { origen: datos.origen ?? "formulario", servicioKey: datos.servicioKey ?? null },
        });
      }

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
