import { readFileSync } from "node:fs";
import pg from "pg";

function leerEntornoLocal(ruta) {
  const resultado = {};
  for (const linea of readFileSync(ruta, "utf8").split(/\r?\n/)) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#")) continue;
    const i = limpia.indexOf("=");
    if (i === -1) continue;
    resultado[limpia.slice(0, i).trim()] = limpia.slice(i + 1).trim();
  }
  return resultado;
}

const envLocal = leerEntornoLocal(new URL("../.env.local", import.meta.url));
const client = new pg.Client({
  connectionString: envLocal.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const tablasCampo = await client.query(
  `SELECT table_name FROM information_schema.tables WHERE table_schema='campo' ORDER BY table_name`,
);
console.log("TABLAS_CAMPO:", tablasCampo.rows.map((r) => r.table_name).join(", "));

const conteosPublic = await client.query(
  `SELECT 'users' AS tabla, count(*)::bigint AS filas FROM public.users
   UNION ALL SELECT 'crops', count(*) FROM public.crops
   UNION ALL SELECT 'municipalities', count(*) FROM public.municipalities
   UNION ALL SELECT 'plots', count(*) FROM public.plots
   UNION ALL SELECT 'leads', count(*) FROM public.leads
   UNION ALL SELECT 'devices', count(*) FROM public.devices`,
);
console.log(
  "CONTEO_PUBLIC:\n" +
    conteosPublic.rows.map((r) => `  ${r.table_name}: ${r.filas}`).join("\n"),
);

const conteosCampo = await client.query(
  `SELECT 'campo.parcelas' AS t, count(*) FROM campo.parcelas
   UNION ALL SELECT 'campo.evaluaciones', count(*) FROM campo.evaluaciones
   UNION ALL SELECT 'campo.alertas', count(*) FROM campo.alertas
   UNION ALL SELECT 'campo.weather_cache', count(*) FROM campo.weather_cache`,
);
console.log("CONTEO_CAMPO:", JSON.stringify(conteosCampo.rows));

const cacheMuestra = await client.query(
  `SELECT slug, provider, fetched_at, expires_at
   FROM campo.weather_cache ORDER BY fetched_at DESC LIMIT 3`,
);
console.log("CACHE_MUESTRA:", JSON.stringify(cacheMuestra.rows));

await client.end();