import { NextResponse } from "next/server";
import { obtenerDb } from "@/lib/datos/db";
import { cultivos, explotaciones, parcelasPlataforma } from "@/lib/datos/plataforma-schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.v1.plots");
export const dynamic = "force-dynamic";

const esquemaCrear = z.object({
  name: z.string().trim().min(1).max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  cropId: z.string().uuid(),
  areaHa: z.number().positive().optional(),
});

async function resolverFarm(userId: string): Promise<string> {
  const db = obtenerDb();
  const [farm] = await db.select({ id: explotaciones.id }).from(explotaciones).where(eq(explotaciones.userId, userId)).limit(1);
  if (farm) return farm.id;
  const [nueva] = await db.insert(explotaciones).values({ userId, name: "Mi explotación" }).returning({ id: explotaciones.id });
  return nueva!.id;
}

export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Falta userId." }, { status: 400 });
  return conRequestId({ user_id: userId }, async (requestId) => {
    const inicio = Date.now();
    try {
      const db = obtenerDb();
      const farms = await db.select({ id: explotaciones.id }).from(explotaciones).where(eq(explotaciones.userId, userId));
      const farmIds = farms.map((f) => f.id);
      if (farmIds.length === 0) {
        log.info("v1.plots.listar.ok", { status: 200, duracion_ms: Date.now() - inicio, data: { total: 0 } });
        return conCabeceraRequestId(NextResponse.json([]), requestId);
      }
      const { inArray } = await import("drizzle-orm");
      const plots = await db.select().from(parcelasPlataforma).where(inArray(parcelasPlataforma.farmId, farmIds));
      log.info("v1.plots.listar.ok", { status: 200, duracion_ms: Date.now() - inicio, data: { total: plots.length } });
      return conCabeceraRequestId(NextResponse.json(plots), requestId);
    } catch (error) {
      log.error("v1.plots.listar.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo listar." }, { status: 503 }), requestId);
    }
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = esquemaCrear.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Solicitud no válida.", issues: parsed.error.issues }, { status: 400 });
  const userId = new URL(req.url).searchParams.get("userId") ?? (body as Record<string, unknown>).userId as string | undefined;
  if (!userId) return NextResponse.json({ error: "Falta userId (?userId=)." }, { status: 400 });
  return conRequestId({ user_id: userId }, async (requestId) => {
    const inicio = Date.now();
    try {
      const db = obtenerDb();
      // verificar crop existe
      const [crop] = await db.select({ id: cultivos.id }).from(cultivos).where(eq(cultivos.id, parsed.data.cropId)).limit(1);
      if (!crop) return conCabeceraRequestId(NextResponse.json({ error: "Cultivo no encontrado." }, { status: 404 }), requestId);
      const farmId = await resolverFarm(userId);
      const [plot] = await db.insert(parcelasPlataforma).values({
        farmId,
        name: parsed.data.name,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        cropId: parsed.data.cropId,
        areaHa: parsed.data.areaHa ?? null,
      }).returning();
      log.info("v1.plots.crear.ok", { status: 201, duracion_ms: Date.now() - inicio, data: { plotId: plot!.id } });
      return conCabeceraRequestId(NextResponse.json(plot, { status: 201 }), requestId);
    } catch (error) {
      log.error("v1.plots.crear.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo crear." }, { status: 503 }), requestId);
    }
  });
}
