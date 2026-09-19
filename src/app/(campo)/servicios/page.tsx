import type { Metadata } from "next";
import { BotonSolicitar } from "@/components/servicios/boton-solicitar";
import type { InteresLead } from "@/lib/dominio/leads";

interface Servicio {
  titulo: string;
  descripcion: string;
  problema: string;
  mide: string;
  incluye: string[];
  noIncluye: string[];
  precio: string;
  comoFunciona: string;
  cuando: string;
  servicioKey: string;
  interes: InteresLead;
  anchor: string;
}

const servicios: Servicio[] = [
  {
    titulo: "Sensor de temperatura TecRural",
    descripcion: "Mide la temperatura real de tu parcela para anticipar heladas.",
    problema: "La previsión de cuadrícula no refleja heladas radiativas locales.",
    mide: "Temperatura del aire a 1,5 m, cada 10 min, con alerta de helada.",
    incluye: ["Sensor calibrado", "Soporte y batería", "Avisos por helada en la app"],
    noIncluye: ["Instalación eléctrica", "Mantenimiento de mástil"],
    precio: "Desde 290 € + cuota 9 €/mes",
    comoFunciona: "Colocamos el sensor en tu parcela. Ves la temperatura real y recibes alerta si baja del umbral de tu cultivo.",
    cuando: "Para helada",
    servicioKey: "sensor_temperatura",
    interes: "SENSORS",
    anchor: "sensor-temperatura",
  },
  {
    titulo: "Sensor de humedad del suelo",
    descripcion: "Conoce la humedad real del suelo antes de regar.",
    problema: "La demanda hídrica estimada no sabe si tu suelo está húmedo.",
    mide: "Humedad volumétrica a 30 cm, cada 30 min.",
    incluye: ["Sonda capacitiva", "Transmisión LoRa", "Histórico en app"],
    noIncluye: ["Válvulas de riego", "Programador"],
    precio: "Desde 340 € + cuota 9 €/mes",
    comoFunciona: "Enterramos la sonda. Consultas humedad y decides riego con datos, no a ojo.",
    cuando: "Para demanda de agua",
    servicioKey: "sensor_humedad",
    interes: "SENSORS",
    anchor: "sensor-humedad",
  },
  {
    titulo: "Estación meteorológica local",
    descripcion: "Datos de tu finca, no de la cuadrícula.",
    problema: "La previsión general falla en valles y laderas.",
    mide: "Temperatura, humedad, viento, lluvia, radiación.",
    incluye: ["Estación completa", "Panel solar", "Datos cada 10 min"],
    noIncluye: ["Obra civil", "Conectividad por cable"],
    precio: "Desde 890 €",
    comoFunciona: "Instalamos la estación en punto representativo. Tus alertas usan tus datos, no los de la cuadrícula.",
    cuando: "Para precisión local",
    servicioKey: "estacion_meteorologica",
    interes: "WEATHER_STATION",
    anchor: "estacion-local",
  },
  {
    titulo: "Analizar una fotografía — diagnóstico",
    descripcion: "Envía foto de hoja/fruto y revisamos síntomas.",
    problema: "No sabes si es hongo, carencia o plaga.",
    mide: "Análisis visual por técnico + IA de apoyo.",
    incluye: ["Revisión en 24 h", "Recomendación no vinculante"],
    noIncluye: ["Diagnóstico oficial", "Receta fitosanitaria"],
    precio: "14,90 € por foto · bono 5×49 €",
    comoFunciona: "Subes foto en la app. Un técnico responde con hipótesis y pasos a seguir, sin visitar.",
    cuando: "Para fitosanitario",
    servicioKey: "diagnostico_foto",
    interes: "AI_DIAGNOSIS",
    anchor: "diagnostico-foto",
  },
  {
    titulo: "Informes de campaña",
    descripcion: "Resumen de riesgos, demanda y decisiones.",
    problema: "Pierdes el histórico de qué pasó y qué hiciste.",
    mide: "Recopilación de tus datos y alertas.",
    incluye: ["PDF mensual", "Comparativa campaña"],
    noIncluye: ["Asesoría agronómica continua"],
    precio: "Desde 19 €/mes",
    comoFunciona: "Generamos informe automático con tus parcelas. Lo usas para PAC o para decidir.",
    cuando: "Para historial",
    servicioKey: "informes_campana",
    interes: "REPORTS",
    anchor: "informes",
  },
  {
    titulo: "Seguimiento de parcelas",
    descripcion: "Técnico que vigila tus parcelas en temporada.",
    problema: "No puedes estar cada día en campo.",
    mide: "Visitas + alertas interpretadas.",
    incluye: ["Visita quincenal", "Informe y llamada"],
    noIncluye: ["Productos fitosanitarios", "Mano de obra"],
    precio: "A consultar según hectáreas",
    comoFunciona: "Un técnico asignado revisa tus alertas y te avisa solo si hay que actuar.",
    cuando: "Seguimiento",
    servicioKey: "seguimiento_parcelas",
    interes: "REPORTS",
    anchor: "seguimiento",
  },
];

export const metadata: Metadata = {
  title: "Servicios TecRural",
  description:
    "Servicios TecRural relacionados con el problema detectado en tu parcela.",
};

export default function ServiciosPage() {
  return (
    <>
      <section>
        <h1 className="text-lg font-semibold text-stone-800">
          Servicios TecRural
        </h1>
        <p className="mt-1 text-[13px] text-stone-500">
          Cuando detectemos un problema, te sugeriremos cuál de estos servicios
          puede ayudarte.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        {servicios.map((servicio) => (
          <article
            key={servicio.servicioKey}
            id={servicio.anchor}
            className="scroll-mt-20 rounded-2xl border-2 border-stone-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-bold text-stone-900">{servicio.titulo}</h2>
            <p className="mt-1 text-base leading-snug text-stone-700">{servicio.descripcion}</p>

            <dl className="mt-4 flex flex-col gap-3">
              <div>
                <dt className="text-sm font-bold text-stone-900">Qué problema resuelve</dt>
                <dd className="mt-1 text-sm leading-snug text-stone-700">{servicio.problema}</dd>
              </div>
              <div>
                <dt className="text-sm font-bold text-stone-900">Qué mide</dt>
                <dd className="mt-1 text-sm leading-snug text-stone-700">{servicio.mide}</dd>
              </div>
              <div>
                <dt className="text-sm font-bold text-stone-900">Qué incluye</dt>
                <dd className="mt-1 text-sm leading-snug text-stone-700">{servicio.incluye.join(" · ")}</dd>
              </div>
              <div>
                <dt className="text-sm font-bold text-stone-900">Qué no incluye</dt>
                <dd className="mt-1 text-sm leading-snug text-stone-600">{servicio.noIncluye.join(" · ")}</dd>
              </div>
              <div>
                <dt className="text-sm font-bold text-stone-900">Precio orientativo</dt>
                <dd className="mt-1 text-sm font-semibold text-brand-800">{servicio.precio}</dd>
              </div>
              <div>
                <dt className="text-sm font-bold text-stone-900">Cómo funciona</dt>
                <dd className="mt-1 text-sm leading-snug text-stone-700">{servicio.comoFunciona}</dd>
              </div>
            </dl>

            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-brand-700">{servicio.cuando}</p>
            <BotonSolicitar servicioKey={servicio.servicioKey} interes={servicio.interes} etiqueta="Solicitar información" />
          </article>
        ))}
      </section>
    </>
  );
}
