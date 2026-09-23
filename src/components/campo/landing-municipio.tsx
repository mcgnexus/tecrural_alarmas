"use client";

import { useEffect, useMemo, useState } from "react";
import { BloqueValorAgricola } from "@/components/campo/bloque-valor-agricola";
import { MeteoZona } from "@/components/campo/meteo-zona";
import { FormularioContacto } from "@/components/servicios/formulario-contacto";
import { catalogoCultivos } from "@/lib/cultivos/catalogo";
import type { CulturaId } from "@/lib/cultivos/catalogo";
import type { MunicipioPublico } from "@/lib/datos/municipios-publicos";

export function LandingMunicipio({ municipio }: { municipio: MunicipioPublico }) {
  const [cultivo, setCultivo] = useState<CulturaId | "">("");
  const ubicacion = useMemo(() => ({
    lat: municipio.latitude,
    lon: municipio.longitude,
    nombre: `${municipio.name}, ${municipio.province}`,
    province: municipio.province,
    aemetMunicipio: municipio.aemetMunicipio,
  }), [municipio]);

  useEffect(() => {
    try {
      window.localStorage.setItem("tecrural:ubicacion", JSON.stringify(ubicacion));
      window.localStorage.setItem("tecrural:zona", municipio.zona);
      window.dispatchEvent(new Event("tecrural:datos-actualizados"));
    } catch {}
  }, [municipio, ubicacion]);

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-3xl border-2 border-earth-700 bg-wheat-50 p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wider text-olive-700">{municipio.region} · Granada</p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-stone-950">
          Avisos de helada y viento en {municipio.name}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-stone-700">
          Consulta la previsión municipal de {municipio.name} y revisa cómo puede afectar la helada y el viento al cultivo que elijas. La consulta es gratuita y no requiere cuenta.
        </p>
        <p className="mt-3 rounded-xl border border-stone-200 bg-white p-3 text-sm leading-relaxed text-stone-600">
          La previsión corresponde al municipio, no es una medición meteorológica de tu parcela. Las condiciones pueden variar dentro de la zona.
        </p>
      </section>

      <section className="scroll-mt-24 flex flex-col gap-3" aria-labelledby="prevision-local-titulo">
        <h2 id="prevision-local-titulo" className="text-xl font-extrabold text-stone-950">Tiempo de {municipio.name}</h2>
        <MeteoZona ubicacion={ubicacion} />
        <BloqueValorAgricola ubicacion={ubicacion} cultivo={cultivo || undefined} />
      </section>

      <section className="rounded-2xl border-2 border-brand-800 bg-white p-5 shadow-sm" aria-labelledby="avisos-locales-titulo">
        <h2 id="avisos-locales-titulo" className="text-xl font-extrabold text-stone-950">Activa avisos gratis para {municipio.name}</h2>
        <p className="mt-1 text-base text-stone-700">Primero revisa la previsión. Si te sirve, activa avisos de helada y viento para esta zona.</p>
        <div className="mt-3">
          <FormularioContacto
            key={municipio.slug}
            municipioInicial={municipio.name}
            cultivoInicial={cultivo ? catalogoCultivos[cultivo].nombre : ""}
            onCultivoChange={(nombre) => {
              const id = Object.entries(catalogoCultivos).find(([, datos]) => datos.nombre === nombre)?.[0] as CulturaId | undefined;
              setCultivo(id ?? "");
            }}
            activarAvisosGratis
            ubicacionAvisos={{ lat: municipio.latitude, lon: municipio.longitude }}
          />
        </div>
      </section>

      <section className="rounded-2xl border-2 border-stone-200 bg-white p-5" aria-labelledby="preguntas-locales-titulo">
        <h2 id="preguntas-locales-titulo" className="text-lg font-extrabold text-stone-950">Avisos agrícolas en {municipio.name}: preguntas frecuentes</h2>
        <details className="mt-3 rounded-xl border border-stone-200 p-3">
          <summary className="cursor-pointer font-bold text-stone-800">¿La previsión es exacta para mi parcela?</summary>
          <p className="mt-2 text-sm leading-relaxed text-stone-700">No. Se basa en datos meteorológicos municipales de AEMET y Open-Meteo; el relieve y las condiciones de cada parcela pueden cambiar el tiempo local.</p>
        </details>
        <details className="mt-2 rounded-xl border border-stone-200 p-3">
          <summary className="cursor-pointer font-bold text-stone-800">¿Cuándo llegan los avisos?</summary>
          <p className="mt-2 text-sm leading-relaxed text-stone-700">Las evaluaciones se ejecutan de forma programada y envían mensajes al WhatsApp indicado si detectan un riesgo relevante para el municipio y el cultivo. No es un servicio en tiempo real.</p>
        </details>
      </section>
    </div>
  );
}
