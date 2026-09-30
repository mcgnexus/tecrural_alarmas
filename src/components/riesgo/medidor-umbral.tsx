"use client";

import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { catalogoCultivos } from "@/lib/cultivos/catalogo";
import type { CulturaId } from "@/lib/cultivos/catalogo";

type Referencia = { valor: number; etiqueta: string; color: string };

type Escala = {
  valor: number;
  unidad: string;
  min: number;
  max: number;
  refs: Referencia[];
  color: string;
  resumen: string;
};

const GENERICO = {
  tminMortal: -2.5,
  tminHelada: 0,
  tmaxEstres: 38,
  vientoCriticoKmh: 45,
  lluviaAvisoMm: 20,
  lluviaCriticaMm: 40,
};

function construir(tipo: string, valor: number, cultivo?: CulturaId): Escala | null {
  const umbrales = cultivo ? catalogoCultivos[cultivo].umbrales : null;
  const tminMortal = umbrales?.tminMortal ?? GENERICO.tminMortal;
  const tminHelada = umbrales?.tminHelada ?? GENERICO.tminHelada;
  const tmaxEstres = umbrales?.tmaxEstres ?? GENERICO.tmaxEstres;
  const vientoCritico = umbrales?.vientoCriticoKmh ?? GENERICO.vientoCriticoKmh;
  const lluviaAviso = umbrales?.lluviaAvisoMm ?? GENERICO.lluviaAvisoMm;
  const lluviaCritica = umbrales?.lluviaCriticaMm ?? GENERICO.lluviaCriticaMm;

  if (tipo === "helada") {
    const color = valor <= tminMortal ? "#dc2626" : valor <= tminHelada ? "#ea580c" : "#eab308";
    return {
      valor,
      unidad: "°C",
      min: Math.min(valor, tminMortal) - 3,
      max: Math.max(valor, tminHelada) + 3,
      refs: [
        { valor: tminMortal, etiqueta: "Mortal", color: "#dc2626" },
        { valor: tminHelada, etiqueta: "Helada", color: "#ea580c" },
      ],
      color,
      resumen: `Mínima prevista ${valor} °C · umbral de helada ${tminHelada} °C · umbral mortal ${tminMortal} °C`,
    };
  }
  if (tipo === "golpe-de-calor") {
    return {
      valor,
      unidad: "°C",
      min: tmaxEstres - 12,
      max: Math.max(valor, tmaxEstres) + 4,
      refs: [{ valor: tmaxEstres, etiqueta: "Estrés", color: "#ea580c" }],
      color: valor >= tmaxEstres ? "#dc2626" : "#ea580c",
      resumen: `Máxima prevista ${valor} °C · umbral de estrés térmico ${tmaxEstres} °C`,
    };
  }
  if (tipo === "viento") {
    return {
      valor,
      unidad: "km/h",
      min: 0,
      max: Math.max(valor, vientoCritico) * 1.3,
      refs: [{ valor: vientoCritico, etiqueta: "Umbral", color: "#ea580c" }],
      color: valor >= vientoCritico ? "#dc2626" : "#ea580c",
      resumen: `Racha máxima ${valor} km/h · umbral de tu cultivo ${vientoCritico} km/h`,
    };
  }
  if (tipo === "lluvia") {
    return {
      valor,
      unidad: "mm",
      min: 0,
      max: Math.max(valor, lluviaCritica) * 1.2,
      refs: [
        { valor: lluviaAviso, etiqueta: "Aviso", color: "#eab308" },
        { valor: lluviaCritica, etiqueta: "Crítico", color: "#dc2626" },
      ],
      color: valor >= lluviaCritica ? "#dc2626" : "#eab308",
      resumen: `Lluvia prevista ${valor} mm · umbral de aviso ${lluviaAviso} mm · umbral crítico ${lluviaCritica} mm`,
    };
  }
  return null;
}

export function MedidorUmbral({ tipo, valor, cultivo }: { tipo: string; valor: number; cultivo?: CulturaId }) {
  const escala = construir(tipo, valor, cultivo);
  if (!escala) return null;
  const datos = [{ nombre: "valor", valor: escala.valor }];

  return (
    <figure className="rounded-xl border border-stone-200 bg-white p-3">
      <figcaption className="text-xs font-bold uppercase tracking-wide text-stone-500">Valor frente a tu umbral</figcaption>
      <div className="mt-1 h-24" role="img" aria-label={escala.resumen}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={datos} margin={{ top: 22, right: 16, left: 16, bottom: 4 }}>
            <XAxis type="number" domain={[escala.min, escala.max]} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="nombre" hide />
            {escala.refs.map((ref) => (
              <ReferenceLine
                key={ref.etiqueta}
                x={ref.valor}
                stroke={ref.color}
                strokeDasharray="4 3"
                label={{ value: `${ref.etiqueta} ${ref.valor}`, position: "insideTopRight", fontSize: 11, fill: ref.color }}
              />
            ))}
            <Bar dataKey="valor" barSize={28} radius={[4, 4, 4, 4]} isAnimationActive={false}>
              <Cell fill={escala.color} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-sm font-semibold text-stone-700">{escala.resumen}</p>
    </figure>
  );
}
