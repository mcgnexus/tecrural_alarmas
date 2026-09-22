import type { Metadata } from "next";
import Link from "next/link";
import { FormularioContacto } from "@/components/servicios/formulario-contacto";
import { EnlaceWhatsapp } from "@/components/analitica/enlace-whatsapp";
import { enlaceWhatsapp } from "@/lib/config/contacto";
import type { InteresLead } from "@/lib/dominio/leads";
import { DiagnosticoFoto } from "@/components/servicios/diagnostico-foto";

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

const NOTA_HARDWARE = "Instalación y equipamiento según parcela. Te confirmamos el precio exacto después de conocer tu explotación.";
const PRECIO_MONITORIZACION_SENSOR = "Monitorización con sensor incluida desde 19,90 €/mes";
const TIPO_EQUIPO_MAS_PLAN = "Suscripción mensual (equipo e instalación incluidos según parcela)";
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
    precio: PRECIO_MONITORIZACION_SENSOR,
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
    precio: PRECIO_MONITORIZACION_SENSOR,
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
    precio: "Monitorización con estación incluida desde 19,90 €/mes",
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
  // Fase 3: contenido premium oculto temporalmente — componentes conservados (planes, sensores, diagnóstico, informes) para fase premium
  return (
    <>
      <section>
        <h1 className="text-lg font-semibold text-stone-800">Servicios TecRural</h1>
        <p className="mt-1 text-[13px] text-stone-500">Servicios avanzados (sensores, diagnóstico, informes, seguimiento) disponibles próximamente. Por ahora, recibe avisos gratuitos de helada y viento.</p>
      </section>
      <section className="rounded-2xl border-2 border-brand-800 bg-brand-50 p-5">
        <h2 className="text-lg font-bold text-stone-900">¿Necesitas algo más?</h2>
        <p className="mt-1 text-sm text-stone-700">Cuéntanos tu cultivo y zona y te orientamos. Sin compromiso.</p>
        <Link href="/#captacion" className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-brand-800 px-5 py-3 text-base font-bold text-white">Recibir avisos de mi zona</Link>
      </section>
      {/* Premium conservado sin renderizar — ver SERVICIOS_PREMIUM_OCULTOS arriba y DiagnosticoFoto/servicios array */}
    </>
  );
}
