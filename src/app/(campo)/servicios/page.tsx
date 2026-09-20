import type { Metadata } from "next";
import { FormularioContacto } from "@/components/servicios/formulario-contacto";
import { EnlaceWhatsapp } from "@/components/analitica/enlace-whatsapp";
import { enlaceWhatsapp } from "@/lib/config/contacto";
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
  /** Nota de relación con los planes, p. ej. hardware como complemento. */
  notaPlanes?: string;
  /** Qué se compra exactamente: suscripción, equipo, servicio o combinación. */
  tipoCompra: string;
}

const NOTA_HARDWARE = "El sensor se instala como complemento de los planes Monitor y Pro.";
const TIPO_EQUIPO_MAS_PLAN = "Equipo (pago único) + suscripción al plan Monitor o Pro";
const TIPO_SUSCRIPCION = "Suscripción mensual";

const planes = [
  { nombre: "Gratis", precio: "0 €", detalle: "Para empezar a consultar tu zona" },
  { nombre: "Esencial", precio: "9,90 €/mes", detalle: "Alertas para tu parcela" },
  { nombre: "Monitor", precio: "19,90 €/mes", detalle: "Seguimiento continuo" },
  { nombre: "Pro", precio: "39,90 €/mes", detalle: "Máximo detalle y prioridad" },
  { nombre: "Cooperativas", precio: "desde 79 €/mes", detalle: "Varias parcelas y usuarios" },
];

const servicios: Servicio[] = [
  {
    titulo: "Sensor de temperatura TecRural",
    descripcion: "Mide la temperatura real de tu parcela para anticipar heladas.",
    problema: "La previsión de cuadrícula no refleja heladas radiativas locales.",
    mide: "Temperatura del aire a 1,5 m, cada 10 min, con alerta de helada.",
    incluye: ["Sensor calibrado", "Soporte y batería", "Avisos por helada en la app"],
    noIncluye: ["Instalación eléctrica", "Mantenimiento de mástil"],
    precio: "Desde 290 € (equipo)",
    comoFunciona: "Colocamos el sensor en tu parcela. Ves la temperatura real y recibes alerta si baja del umbral de tu cultivo.",
    cuando: "Para helada",
    servicioKey: "sensor_temperatura",
    interes: "SENSORS",
    anchor: "sensor-temperatura",
    notaPlanes: NOTA_HARDWARE,
    tipoCompra: TIPO_EQUIPO_MAS_PLAN,
  },
  {
    titulo: "Sensor de humedad del suelo",
    descripcion: "Conoce la humedad real del suelo antes de regar.",
    problema: "La demanda hídrica estimada no sabe si tu suelo está húmedo.",
    mide: "Humedad volumétrica a 30 cm, cada 30 min.",
    incluye: ["Sonda capacitiva", "Transmisión LoRa", "Histórico en app"],
    noIncluye: ["Válvulas de riego", "Programador"],
    precio: "Desde 340 € (equipo)",
    comoFunciona: "Enterramos la sonda. Consultas humedad y decides riego con datos, no a ojo.",
    cuando: "Para demanda de agua",
    servicioKey: "sensor_humedad",
    interes: "SENSORS",
    anchor: "sensor-humedad",
    notaPlanes: NOTA_HARDWARE,
    tipoCompra: TIPO_EQUIPO_MAS_PLAN,
  },
  {
    titulo: "Estación meteorológica local",
    descripcion: "Datos de tu finca, no de la cuadrícula.",
    problema: "La previsión general falla en valles y laderas.",
    mide: "Temperatura, humedad, viento, lluvia, radiación.",
    incluye: ["Estación completa", "Panel solar", "Datos cada 10 min"],
    noIncluye: ["Obra civil", "Conectividad por cable"],
    precio: "Desde 890 € (equipo)",
    comoFunciona: "Instalamos la estación en punto representativo. Tus alertas usan tus datos, no los de la cuadrícula.",
    cuando: "Para precisión local",
    servicioKey: "estacion_meteorologica",
    interes: "WEATHER_STATION",
    anchor: "estacion-local",
    notaPlanes: NOTA_HARDWARE,
    tipoCompra: TIPO_EQUIPO_MAS_PLAN,
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
    tipoCompra: "Servicio puntual (pago por uso)",
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
    tipoCompra: TIPO_SUSCRIPCION,
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
    tipoCompra: "Servicio técnico (sin cuota)",
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

      {/* Planes: suscripciones mensuales. El hardware se añade como complemento. */}
      <section id="planes" className="scroll-mt-20 rounded-2xl border-2 border-brand-800 bg-brand-50 p-5">
        <h2 className="text-lg font-bold text-stone-900">Planes TecRural</h2>
        <p className="mt-1 text-sm leading-snug text-stone-700">
          Suscripción mensual según lo que necesites. Los sensores y estaciones se añaden después como complemento del plan.
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {planes.map((plan) => (
            <li key={plan.nombre} className="flex items-center justify-between rounded-xl border-2 border-stone-200 bg-white px-4 py-3">
              <span className="text-base font-bold text-stone-900">{plan.nombre}</span>
              <span className="text-right">
                <span className="block text-base font-extrabold text-brand-800">{plan.precio}</span>
                <span className="block text-xs font-medium text-stone-600">{plan.detalle}</span>
              </span>
            </li>
          ))}
        </ul>
        <a
          href="/#contacto"
          className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brand-800 px-5 py-3 text-base font-bold text-white hover:bg-brand-900"
        >
          Elegir plan — te ayudamos →
        </a>
      </section>

      <section className="flex flex-col gap-4">
        {servicios.map((servicio) => {
          const wa = enlaceWhatsapp(`Hola, quiero información sobre: ${servicio.titulo}`);
          return (
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
                {servicio.notaPlanes ? (
                  <dd className="mt-1 rounded-lg border-2 border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-snug text-amber-800">
                    {servicio.notaPlanes}
                  </dd>
                ) : null}
              </div>
              <div>
                <dt className="text-sm font-bold text-stone-900">Cómo funciona</dt>
                <dd className="mt-1 text-sm leading-snug text-stone-700">{servicio.comoFunciona}</dd>
              </div>
            </dl>

            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-brand-700">{servicio.cuando}</p>
            <p className="mt-2 rounded-lg border-2 border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold leading-snug text-stone-700">
              Qué compras: {servicio.tipoCompra}
            </p>

            {/* Formulario breve con este servicio preseleccionado. */}
            <div className="mt-4">
              <FormularioContacto
                servicioKey={servicio.servicioKey}
                servicioNombre={servicio.titulo}
                interes={servicio.interes}
              />
            </div>

            {wa ? (
              <EnlaceWhatsapp
                href={wa}
                ubicacion={servicio.servicioKey}
                className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-600 bg-white px-4 py-3 text-base font-bold text-emerald-700 hover:bg-emerald-50"
              >
                💬 Preguntar por WhatsApp
              </EnlaceWhatsapp>
            ) : null}
          </article>
          );
        })}
      </section>
    </>
  );
}
