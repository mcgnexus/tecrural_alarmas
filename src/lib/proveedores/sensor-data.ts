import type { SensorData } from "@/lib/dominio/sensores";
import { obtenerSensorData } from "@/lib/datos/sensores-repo";

/**
 * SensorDataProvider — preparación arquitectura.
 * Hoy no hay sensores conectados; devuelve null y queda listo para
 * integración en RiskContext. Posteriormente se puede sustituir por
 * un provider LoRa/MQTT real.
 */
export interface SensorDataProvider {
  getData(plotId: string): Promise<SensorData | null>;
}

export const sensorDataProvider: SensorDataProvider = {
  async getData(plotId: string): Promise<SensorData | null> {
    try {
      return await obtenerSensorData(plotId);
    } catch {
      return null;
    }
  },
};
