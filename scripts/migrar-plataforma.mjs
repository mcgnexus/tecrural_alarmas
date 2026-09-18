import { readFileSync } from "node:fs";
import pg from "pg";

function leerEntornoLocal(ruta) {
  const contenido = readFileSync(ruta, "utf8");
  const resultado = {};
  for (const linea of contenido.split(/\r?\n/)) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#")) continue;
    const indice = limpia.indexOf("=");
    if (indice === -1) continue;
    resultado[limpia.slice(0, indice).trim()] = limpia.slice(indice + 1).trim();
  }
  return resultado;
}

const envLocal = leerEntornoLocal(new URL("../.env.local", import.meta.url));
const url = envLocal.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL. Copia .env.example a .env.local.");
  process.exit(1);
}

const sql = readFileSync(
  new URL("./schema-plataforma.sql", import.meta.url),
  "utf8",
);

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query(sql);
  console.log("Migracion de esquema `plataforma` aplicada correctamente.");
} finally {
  await client.end();
}
