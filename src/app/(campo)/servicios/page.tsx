import type { Metadata } from "next";
import { BotonSolicitar } from "@/components/servicios/boton-solicitar";
import type { InteresLead } from "@/lib/dominio/leads";

interface Servicio {
  titulo: string;
  descripcion: string;
  cuando: string;
  servicioKey: string;
  interes: InteresLead;
}

const servicios: Servicio[] = [
  {
    titulo: "Sensores en campo",
    descripcion:
      "Temperatura, humedad y suelo de tu parcela en tiempo real, sin depender solo de la previsión.",
    cuando: "Tus datos, tu parcela",
    servicioKey: "sensores",
    interes: "SENSORS",
  },
  {
    titulo: "Recomendación de riego",
    descripcion:
      "Ajustamos la demanda hídrica orientativa a tu riego y suelo.",
    cuando: "Para quien quiere afinar el riego",
    servicioKey: "recomendacion_riego",
    interes: "IRRIGATION",
  },
  {
    titulo: "Estación meteorológica propia",
    descripcion: "Datos de tu finca, no de la previsión de una cuadrícula.",
    cuando: "Cuando necesitas exactitud local",
    servicioKey: "estacion_meteorologica",
    interes: "WEATHER_STATION",
  },
  {
    titulo: "Diagnóstico vegetal por imagen",
    descripcion:
      "Envía una foto de tu cultivo y revisamos plagas o carencias.",
    cuando: "Ante síntomas que no sabes interpretar",
    servicioKey: "diagnostico_ia",
    interes: "AI_DIAGNOSIS",
  },
  {
    titulo: "Informes de campaña",
    descripcion:
      "Resumen de riesgos, demanda hídrica y decisiones de la campaña.",
    cuando: "Para llevar el historial de la finca",
    servicioKey: "informes_campana",
    interes: "REPORTS",
  },
  {
    titulo: "Seguimiento de parcelas",
    descripcion:
      "Técnico de campo acompañando tus parcelas durante la temporada.",
    cuando: "Si prefieres que alguien vigile por ti",
    servicioKey: "seguimiento_parcelas",
    interes: "REPORTS",
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

      <section className="flex flex-col gap-3">
        {servicios.map((servicio) => (
          <article
            key={servicio.servicioKey}
            className="rounded-xl border border-stone-200 bg-white p-4"
          >
            <h2 className="text-sm font-semibold text-stone-800">
              {servicio.titulo}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-stone-500">
              {servicio.descripcion}
            </p>
            <p className="mt-2 text-[11px] text-brand-700">{servicio.cuando}</p>
            <BotonSolicitar
              servicioKey={servicio.servicioKey}
              interes={servicio.interes}
              etiqueta="Solicitar información"
            />
          </article>
        ))}
      </section>
    </>
  );
}
