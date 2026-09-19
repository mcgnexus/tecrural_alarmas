import { NextResponse } from "next/server";
import { obtenerDb } from "@/lib/datos/db";
import { parcelasPlataforma } from "@/lib/datos/plataforma-schema";
import { eq } from "drizzle-orm";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.v1.plots.id");
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return conRequestId({}, async (requestId) => {
    const inicio = Date.now();
    try {
      const db = obtenerDb();
      const [plot] = await db.select().from(parcelasPlataforma).where(eq(parcelasPlataforma.id, id)).limit(1);
      if (!plot) return conCabeceraRequestId(NextResponse.json({ error: "No encontrado." }, { status: 404 }), requestId);
      log.info("v1.plots.obtener.ok", { status: 200, duracion_ms: Date.now() - inicio });
      return conCabeceraRequestId(NextResponse.json(plot), requestId);
    } catch (error) {
      log.error("v1.plots.obtener.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo obtener." }, { status: 503 }), requestId);
    }
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Cuerpo no válido." }, { status: 400 });
  const permitidos: Record<string, unknown> = {};
  for (const k of ["name","latitude","longitude","elevationM","areaHa","cropId","phenologicalStateId","irrigated","irrigationType","soilType"]) {
    if (k in body) permitidos[k === "elevationM" ? "elevationM" : k] = body[k];
  }
  // mapear nombres camel
  const set: Record<string, unknown> = {};
  if (typeof permitidos.name === "string") set.name = permitidos.name;
  if (typeof permitidos.latitude === "number") set.latitude = permitidos.latitude;
  if (typeof permitidos.longitude === "number") set.longitude = permitidos.longitude;
  if (permitidos.elevationM !== undefined) set.elevationM = permitidos.elevationM as number;
  if (permitidos.areaHa !== undefined) set.areaHa = permitidos.areaHa as number;
  if (permitidos.cropId !== undefined) set.cropId = permitidos.cropId as string;
  if (permitidos.phenologicalStateId !== undefined) set.phenologicalStateId = permitidos.phenologicalStateId as string;
  if (permitidos.irrigated !== undefined) set.irrigated = permitidos.irrigated as boolean;
  if (permitidos.irrigationType !== undefined) set.irrigationType = permitidos.irrigationType as string;
  if (permitidos.soilType !== undefined) set.soilType = permitidos.soilType as string;

  return conRequestId({}, async (requestId) => {
    const inicio = Date.now();
    try {
      const db = obtenerDb();
      const [plot] = await db.update(parcelasPlataforma).set({ ...set, updatedAt: new Date() }).where(eq(parcelasPlataforma.id, id)).returning();
      if (!plot) return conCabeceraRequestId(NextResponse.json({ error: "No encontrado." }, { status: 404 }), requestId);
      log.info("v1.plots.actualizar.ok", { status: 200, duracion_ms: Date.now() - inicio });
      return conCabeceraRequestId(NextResponse.json(plot), requestId);
    } catch (error) {
      log.error("v1.plots.actualizar.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo actualizar." }, { status: 503 }), requestId);
    }
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return conRequestId({}, async (requestId) => {
    const inicio = Date.now();
    try {
      const db = obtenerDb();
      const borrados = await db.delete(parcelasPlataforma).where(eq(parcelasPlataforma.id, id)).returning({ id: parcelasPlataforma.id });
      if (borrados.length === 0) return conCabeceraRequestId(NextResponse.json({ error: "No encontrado." }, { status: 404 }), requestId);
      log.info("v1.plots.eliminar.ok", { status: 200, duracion_ms: Date.now() - inicio });
      return conCabeceraRequestId(NextResponse.json({ ok: true }), requestId);
    } catch (error) {
      log.error("v1.plots.eliminar.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo eliminar." }, { status: 503 }), requestId);
    }
  });
}
