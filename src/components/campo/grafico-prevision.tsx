"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TickDia } from "./tick-dia";

export type DiaGrafico = {
  clave: string;
  etiqueta: string;
  minima: number | null;
  maxima: number | null;
  lluviaTotal: number | null;
  vientoMaximo: number | null;
  rachaMaxima: number | null;
};

const COLOR_MIN = "#2563eb";
const COLOR_MAX = "#dc2626";
const COLOR_LLUVIA = "#0ea5e9";
const COLOR_RACHA = "#78716c";

function numero(valor: unknown, unidad: string, decimales = 0): string {
  return typeof valor === "number" && Number.isFinite(valor)
    ? `${valor.toFixed(decimales)}${unidad}`
    : `— ${unidad}`;
}

export function GraficoPrevision({ dias }: { dias: DiaGrafico[] }) {
  const datos = dias.map((dia) => ({
    nombre: dia.etiqueta,
    minima: dia.minima,
    maxima: dia.maxima,
    lluvia: dia.lluviaTotal === null ? null : Number(dia.lluviaTotal.toFixed(1)),
    racha: dia.rachaMaxima === null ? null : Math.round(dia.rachaMaxima),
  }));

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <figure className="rounded-xl border-2 border-stone-200 bg-white p-3">
        <figcaption className="text-[15px] font-extrabold text-stone-900">
          🌡️ Temperatura · mínima y máxima por día
        </figcaption>
        <div className="mt-2 h-52" role="img" aria-label="Gráfico de temperaturas mínima y máxima previstas por día">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={datos} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="nombre" tick={<TickDia />} interval={0} />
              <YAxis tick={{ fontSize: 13 }} unit="°" />
              <Tooltip formatter={(valor) => numero(valor, " °C", 1)} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Line type="monotone" dataKey="maxima" name="Máxima" stroke={COLOR_MAX} strokeWidth={3} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="minima" name="Mínima" stroke={COLOR_MIN} strokeWidth={3} dot={{ r: 3 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </figure>

      <figure className="rounded-xl border-2 border-stone-200 bg-white p-3">
        <figcaption className="text-[15px] font-extrabold text-stone-900">
          🌧️ Lluvia y 💨 rachas por día
        </figcaption>
        <div className="mt-2 h-52" role="img" aria-label="Gráfico de lluvia prevista y rachas máximas de viento por día">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={datos} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="nombre" tick={<TickDia />} interval={0} />
              <YAxis yAxisId="lluvia" tick={{ fontSize: 13 }} />
              <YAxis yAxisId="viento" orientation="right" tick={{ fontSize: 13 }} />
              <Tooltip
                formatter={(valor, nombre) => [
                  nombre === "Lluvia" ? numero(valor, " mm", 1) : numero(valor, " km/h"),
                  nombre,
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar yAxisId="lluvia" dataKey="lluvia" name="Lluvia" fill={COLOR_LLUVIA} radius={[4, 4, 0, 0]} />
              <Line yAxisId="viento" type="monotone" dataKey="racha" name="Rachas" stroke={COLOR_RACHA} strokeWidth={3} dot={{ r: 3 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </figure>
    </div>
  );
}
