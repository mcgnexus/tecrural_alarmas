export type EventoLead =
  | "registro_rapido"
  | "cuenta_completada"
  | "explotacion_creada"
  | "parcela_anadida"
  | "avisos_activados"
  | "diagnostico_usado"
  | "riego_consultado"
  | "consulta_meteorologia"
  | "presupuesto_intent"
  | "presupuesto_solicitado"
  | "whatsapp_contact"
  | "interest_SENSORS"
  | "interest_WEATHER_STATION"
  | "interest_AI_DIAGNOSIS"
  | "interest_IRRIGATION"
  | "interest_REPORTS";

export type InteresLead =
  | "SENSORS"
  | "WEATHER_STATION"
  | "AI_DIAGNOSIS"
  | "IRRIGATION"
  | "REPORTS";

export type NivelLead = "frio" | "tibio" | "caliente" | "cualificado";

export type EstadoLead =
  | "NEW"
  | "WARM"
  | "HOT"
  | "QUALIFIED"
  | "CONVERTED"
  | "DISCARDED";

export interface ResumenLead {
  leadId: string;
  score: number;
  nivel: NivelLead;
  estado: string;
  intereses: string[];
}
