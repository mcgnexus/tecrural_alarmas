"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TickDia } from "./tick-dia";

export type NivelGrafico = "info" | "aviso" | "alerta" | "critica";

export type DiaRiesgoGrafico = {
  clave: string;
  etiqueta: string;
  nivel: NivelGrafico;
  detalle: string;
};

const VALOR_NIVEL: Record<NivelGrafico, number> = { info: 0.4, aviso: 1, alerta: 2, critica: 3 };
const COLOR_NIVEL: Record<NivelGrafico, string> = {
  info: "#16a34a",
  aviso: "#eab308",
  alerta: "#ea580c",
  critica: "#dc2626",
};
const EMOJI_NIVEL: Record<NivelGrafico, string> = { info: "✅", aviso: "🟡", alerta: "🟠", critica: "🔴" };

export function GraficoRiesgo({ dias }: { dias: DiaRiesgoGrafico[] }) {
  const datos = dias.map((dia) => ({
    nombre: dia.etiqueta,
    valor: VALOR_NIVEL[dia.nivel],
    nivel: dia.nivel,
    emoji: EMOJI_NIVEL[dia.nivel],
    detalle: dia.detalle,
  }));

  return (
    <figure className="mt-4 rounded-xl border-2 border-stone-200 bg-white p-3">
      <figcaption className="text-[15px] font-extrabold text-stone-900">
        📅 Riesgo de cada día
      </figcaption>
      <div className="mt-2 h-48" role="img" aria-label="Gráfico del nivel de riesgo previsto para cada día">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} margin={{ top: 20, right: 8, left: 4, bottom: 0 }}>
            <XAxis dataKey="nombre" tick={<TickDia />} interval={0} height={34} padding={{ left: 16, right: 16 }} />
            <YAxis
              domain={[0, 3.4]}
              ticks={[0, 1, 2, 3]}
              tickFormatter={(valor: number) => ["", "Aviso", "Alerta", "Crítico"][valor] ?? ""}
              tick={{ fontSize: 13 }}
              width={62}
            />
            <Tooltip
              formatter={(_valor, _nombre, item) => [item.payload.detalle || "Sin riesgo", item.payload.nivel]}
            />
            <Bar dataKey="valor" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {datos.map((dato) => (
                <Cell key={dato.nombre} fill={COLOR_NIVEL[dato.nivel]} />
              ))}
              <LabelList dataKey="emoji" position="top" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
