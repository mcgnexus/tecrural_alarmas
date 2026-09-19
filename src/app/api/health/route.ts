import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { obtenerDb } from "@/lib/datos/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const inicio = Date.now();
  let database: "ok" | "error" = "ok";
  let weatherDataAgeMinutes: number | null = null;

  try {
    const db = obtenerDb();
    await db.execute(sql`SELECT 1`);
  } catch {
    database = "error";
  }

  try {
    const db = obtenerDb();
    const r = await db.execute(sql`SELECT EXTRACT(EPOCH FROM (NOW() - MAX(fetched_at)))/60 as age FROM plataforma.weather_hourly`);
    const age = (r.rows[0] as { age: number | null })?.age;
    weatherDataAgeMinutes = age !== null && Number.isFinite(Number(age)) ? Math.round(Number(age)) : null;
  } catch {
    // ignore
  }

  const latency = Date.now() - inicio;
  const status = database === "ok" ? "ok" : "error";

  return NextResponse.json(
    {
      status,
      database,
      weatherDataAgeMinutes,
      latencyMs: latency,
    },
    { status: status === "ok" ? 200 : 503 },
  );
}
