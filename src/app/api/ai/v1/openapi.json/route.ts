import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    openapi: "3.0.3",
    info: { title: "TecRural AI API", version: "1.0.0", description: "API de solo lectura para agentes de IA." },
    servers: [{ url: "/api/ai/v1" }],
    security: [{ bearerAuth: [] }],
    paths: {
      "/weather/current": { get: { parameters: [{ name: "lat", in: "query", required: true, schema: { type: "number" } }, { name: "lon", in: "query", required: true, schema: { type: "number" } }, { name: "aemetMunicipio", in: "query", schema: { type: "string" } }] } },
      "/phytosanitary": { get: { parameters: [{ name: "cropId", in: "query", schema: { type: "string" } }, { name: "province", in: "query", schema: { type: "string" } }, { name: "municipality", in: "query", schema: { type: "string" } }, { name: "region", in: "query", schema: { type: "string" } }, { name: "limit", in: "query", schema: { type: "integer", maximum: 100 } }] } },
      "/locations/search": { get: { parameters: [{ name: "q", in: "query", schema: { type: "string" } }, { name: "region", in: "query", schema: { type: "string" } }] } },
    },
    components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "AI_API_TOKEN" } } },
  });
}
