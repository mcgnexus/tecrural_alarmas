export interface Sensor {
  id: string;
  plotId: string;
  deviceId: string;
  sensorType: string;
  model: string | null;
  installedAt: string | null;
  status: string;
}

export interface SensorReading {
  id: number;
  sensorId: string;
  timestamp: string;
  soilMoisturePct: number | null;
  airTemperatureC: number | null;
  relativeHumidityPct: number | null;
  soilTemperatureC: number | null;
  batteryVoltage: number | null;
  rawPayload: Record<string, unknown>;
}

export interface SensorData {
  sensores: Sensor[];
  lecturas: SensorReading[];
  // último valor por tipo
  ultimaHumedadSueloPct?: number | null;
  ultimaTemperaturaAireC?: number | null;
}
