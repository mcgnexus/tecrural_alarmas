export type LeadEventType =
  | "APP_VISIT"
  | "LOCATION_SELECTED"
  | "PLOT_CREATED"
  | "CROP_SELECTED"
  | "ALERT_OPENED"
  | "ALERTS_ENABLED"
  | "WATER_VIEWED"
  | "PHYTOSANITARY_VIEWED"
  | "AI_DIAGNOSIS_STARTED"
  | "SENSOR_CTA_VIEWED"
  | "SENSOR_CTA_CLICKED"
  | "IRRIGATION_CTA_CLICKED"
  | "CONTACT_REQUESTED"
  | "QUOTE_REQUESTED";

export interface LeadEventInput {
  userId?: string | null;
  anonymousId?: string | null;
  plotId?: string | null;
  eventType: LeadEventType;
  metadata?: Record<string, unknown>;
  points?: number;
}

export interface LeadEvent {
  id: string;
  userId: string | null;
  anonymousId: string | null;
  plotId: string | null;
  eventType: string;
  metadata: Record<string, unknown>;
  points: number;
  createdAt: string;
}
