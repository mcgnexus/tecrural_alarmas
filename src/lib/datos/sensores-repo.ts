import { desc, eq } from "drizzle-orm";
import { obtenerDb } from "./db";
import { lecturasSensores, sensores } from "./plataforma-schema";
import type { Sensor, SensorData, SensorReading } from "@/lib/dominio/sensores";

function aSensor(f: typeof sensores.$inferSelect): Sensor {
  return {
    id: f.id,
    plotId: f.plotId,
    deviceId: f.deviceId,
    sensorType: f.sensorType,
    model: f.model,
    installedAt: f.installedAt ? f.installedAt.toISOString() : null,
    status: f.status,
  };
}

function aLectura(f: typeof lecturasSensores.$inferSelect): SensorReading {
  return {
    id: f.id,
    sensorId: f.sensorId,
    timestamp: f.timestamp.toISOString(),
    soilMoisturePct: f.soilMoisturePct,
    airTemperatureC: f.airTemperatureC,
    relativeHumidityPct: f.relativeHumidityPct,
    soilTemperatureC: f.soilTemperatureC,
    batteryVoltage: f.batteryVoltage,
    rawPayload: f.rawPayload,
  };
}

export async function listarSensoresPorParcela(plotId: string): Promise<Sensor[]> {
  const db = obtenerDb();
  const filas = await db.select().from(sensores).where(eq(sensores.plotId, plotId));
  return filas.map(aSensor);
}

export async function lecturasRecientes(sensorId: string, limite = 24): Promise<SensorReading[]> {
  const db = obtenerDb();
  const filas = await db.select().from(lecturasSensores).where(eq(lecturasSensores.sensorId, sensorId)).orderBy(desc(lecturasSensores.timestamp)).limit(limite);
  return filas.map(aLectura);
}

export async function obtenerSensorData(plotId: string): Promise<SensorData | null> {
  const lista = await listarSensoresPorParcela(plotId);
  if (lista.length === 0) return null;
  const todas: SensorReading[] = [];
  for (const s of lista) {
    const r = await lecturasRecientes(s.id, 1);
    todas.push(...r);
  }
  if (todas.length === 0) return { sensores: lista, lecturas: [] };
  const ultimaHumedad = todas.find((r) => r.soilMoisturePct !== null)?.soilMoisturePct ?? null;
  const ultimaTemp = todas.find((r) => r.airTemperatureC !== null)?.airTemperatureC ?? null;
  return { sensores: lista, lecturas: todas, ultimaHumedadSueloPct: ultimaHumedad, ultimaTemperaturaAireC: ultimaTemp };
}
