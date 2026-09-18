export interface PhytosanitaryAlert {
  id: string;
  provider: string;
  externalId?: string | null;
  cropId?: string | null;
  title: string;
  summary: string;
  province?: string | null;
  municipality?: string | null;
  severity?: string | null;
  publishedAt: string;
  sourceUrl?: string | null;
  rawPayload?: Record<string, unknown> | null;
}
