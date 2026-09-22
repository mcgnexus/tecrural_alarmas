# API para agentes de IA

Configura `AI_API_TOKEN` en el entorno del servidor. El agente debe enviar:

```http
Authorization: Bearer <AI_API_TOKEN>
```

La especificación está disponible en `GET /api/ai/v1/openapi.json`.

Endpoints de solo lectura:

- `GET /api/ai/v1/weather/current?lat=37.49&lon=-2.77`
- `GET /api/ai/v1/phytosanitary?cropId=olive&region=Costa%20Tropical`
- `GET /api/ai/v1/locations/search?q=Motril`

No se exponen sesiones de usuarios, datos de contacto ni endpoints internos.
