"use client";

import type { Alerta } from "@/lib/dominio/tipos";
import { esDatosCaducados, haceMinutos } from "@/lib/dominio/frescura";
import { colorTemperatura, etiquetaTermica } from "@/lib/ui/temperatura";

type Bloque = {
  key: string;
  etiqueta: string;
  icono: string;
  severidad: string;
  linea1: string;
  linea2: string;
  orden: number;
  claseLinea?: string;
  tituloLinea?: string;
};

const ORDEN: Record<string, number> = { critica: 3, alerta: 2, aviso: 1, info: 0, verde: 0 };

function severidadDe(alerta?: Alerta): string {
  return alerta?.severidad ?? "info";
}

function extraerTemperatura(mensaje: string): string | null {
  const m = mensaje.match(/(-?\d+[.,]\d+)\s*°C/);
  return m ? m[1]!.replace(".", ",") + " °C" : null;
}
function extraerTemperaturaNumero(mensaje: string): number | null {
  const m = mensaje.match(/(-?\d+(?:[.,]\d+)?)\s*°C/);
  if (!m) return null;
  const n = Number(m[1]!.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function extraerRachas(mensaje: string): string | null {
  const m = mensaje.match(/(\d+(?:[.,]\d+)?)\s*km\/h/);
  return m ? `Rachas ${m[1]} km/h` : null;
}

export function DashboardParcela({ alertas, evaluadoEl }: { alertas: Alerta[]; evaluadoEl?: string }) {
  const porTipo = new Map<string, Alerta>();
  for (const a of alertas) porTipo.set(a.tipo, a);

  const bloques: Bloque[] = [];

  // Helada
  {
    const a = porTipo.get("helada");
    const sev = severidadDe(a);
    const temp = a ? extraerTemperatura(a.mensaje) ?? "-1,7 °C" : null;
    const tempNum = a ? extraerTemperaturaNumero(a.mensaje) : null;
    bloques.push({
      key: "helada",
      etiqueta: "Helada",
      icono: sev === "critica" ? "🔴" : sev === "alerta" ? "🟠" : sev === "aviso" ? "🟡" : "🟢",
      severidad: sev,
      linea1: a ? (temp ?? a.titulo) : "Sin riesgo",
      linea2: a ? "04:00–07:00" : "",
      orden: ORDEN[sev] ?? 0,
      claseLinea: a && tempNum !== null ? colorTemperatura(tempNum) : undefined,
      tituloLinea: a && tempNum !== null ? etiquetaTermica(tempNum) : undefined,
    });
  }
  // Lluvia
  {
    const a = porTipo.get("lluvia");
    const sev = severidadDe(a);
    bloques.push({
      key: "lluvia",
      etiqueta: "Lluvia",
      icono: sev === "critica" ? "🔴" : sev === "alerta" ? "🟠" : sev === "aviso" ? "🟡" : "🟢",
      severidad: sev,
      linea1: a ? (a.mensaje.includes("mm") ? a.mensaje.slice(0, 30) : a.titulo) : "Sin riesgo",
      linea2: "",
      orden: ORDEN[sev] ?? 0,
    });
  }
  // Viento
  {
    const a = porTipo.get("viento");
    const sev = severidadDe(a);
    const rachas = a ? extraerRachas(a.mensaje) ?? a.titulo : null;
    bloques.push({
      key: "viento",
      etiqueta: "Viento",
      icono: sev === "critica" ? "🔴" : sev === "alerta" ? "🟠" : sev === "aviso" ? "🟡" : "🟢",
      severidad: sev,
      linea1: a ? (rachas ?? "Rachas elevadas") : "Sin riesgo",
      linea2: "",
      orden: ORDEN[sev] ?? 0,
    });
  }
  // Calor
  {
    const a = porTipo.get("golpe-de-calor");
    const sev = severidadDe(a);
    const tempNum = a ? extraerTemperaturaNumero(a.mensaje) : null;
    bloques.push({
      key: "calor",
      etiqueta: "Calor",
      icono: sev === "critica" ? "🔴" : sev === "alerta" ? "🟠" : sev === "aviso" ? "🟡" : "🟢",
      severidad: sev,
      linea1: a ? (extraerTemperatura(a.mensaje) ?? a.titulo) : "Normal",
      linea2: "",
      orden: ORDEN[sev] ?? 0,
      claseLinea: a && tempNum !== null ? colorTemperatura(tempNum) : undefined,
      tituloLinea: a && tempNum !== null ? etiquetaTermica(tempNum) : undefined,
    });
  }
  // Agua
  {
    const a = porTipo.get("demanda-hidrica");
    const sev = severidadDe(a);
    bloques.push({
      key: "agua",
      etiqueta: "Agua",
      icono: sev === "critica" ? "🔴" : sev === "alerta" ? "🟠" : sev === "aviso" ? "🟡" : "🟢",
      severidad: sev,
      linea1: a ? "Demanda elevada" : "Normal",
      linea2: "",
      orden: ORDEN[sev] ?? 0,
    });
  }
  // Fitosanitario
  {
    const a = porTipo.get("fitosanitario");
    const sev = severidadDe(a);
    bloques.push({
      key: "fitosanitario",
      etiqueta: "Fitosanitario",
      icono: sev === "critica" ? "🔴" : sev === "alerta" ? "🟠" : sev === "aviso" ? "🟡" : "🟢",
      severidad: sev,
      linea1: a ? "1 aviso" : "Sin avisos",
      linea2: "",
      orden: ORDEN[sev] ?? 0,
    });
  }

  // Ordenar primero por gravedad
  bloques.sort((a, b) => b.orden - a.orden);

  const caducado = evaluadoEl ? esDatosCaducados(evaluadoEl, 90) : false;

  return (
    <div className="flex flex-col gap-2">
      {evaluadoEl ? <p className="text-xs font-medium text-stone-600">{haceMinutos(evaluadoEl)}</p> : null}
      {caducado ? (
        <p role="alert" className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-center text-sm font-bold text-amber-800">⚠ Datos meteorológicos pendientes de actualización — no mostrar nivel como actual</p>
      ) : null}
      <div className={`grid grid-cols-2 gap-2 md:grid-cols-3 ${caducado ? "opacity-60" : ""}`}>
        {bloques.map((b) => (
          <div
            key={b.key}
            className={`flex flex-col rounded-xl border-2 bg-white p-3 ${caducado ? "border-stone-300 bg-stone-50" : b.orden === 3 ? "border-red-300 bg-red-50" : b.orden === 2 ? "border-amber-300 bg-amber-50" : b.orden === 1 ? "border-yellow-300 bg-yellow-50" : "border-stone-200"}`}
          >
            <div className="flex items-center gap-1.5">
              <span aria-hidden="true" className="text-base leading-none">{caducado ? "⚪" : b.icono}</span>
              <span className="text-sm font-bold text-stone-900">{b.etiqueta}</span>
            </div>
            <p title={caducado ? undefined : b.tituloLinea} className={`mt-1 text-sm font-semibold leading-tight ${caducado ? "text-stone-900" : b.claseLinea ?? "text-stone-900"}`}>{caducado ? "—" : b.linea1}</p>
            {b.linea2 && !caducado ? <p className="text-xs font-medium text-stone-600">{b.linea2}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
