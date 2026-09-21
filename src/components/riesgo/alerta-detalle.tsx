"use client";

import { CtaContextual } from "@/components/servicios/cta-contextual";
import { esDatosCaducados, haceMinutos } from "@/lib/dominio/frescura";
import type { Alerta } from "@/lib/dominio/tipos";
import { metricasDeAlerta, subtituloDeAlerta } from "@/lib/alertas/metricas";
import { colorTemperatura, etiquetaTermica } from "@/lib/ui/temperatura";

export function AlertaDetalle({ alerta }: { alerta: Alerta }) {
  const esCritica = alerta.severidad === "critica";
  const tituloUpper = alerta.titulo.toUpperCase();
  const icon = esCritica ? "🔴" : alerta.severidad === "alerta" ? "🟠" : alerta.severidad === "aviso" ? "🟡" : "🟢";

  const metricas = metricasDeAlerta(alerta.tipo, alerta.mensaje);

  const fecha = new Date(alerta.emisorAt);
  const actualizacion = fecha.toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const caducado = esDatosCaducados(alerta.emisorAt, 90);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-medium text-stone-600">{haceMinutos(alerta.emisorAt)}</p>
      {caducado ? <p role="alert" className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-center text-sm font-bold text-amber-800">⚠ Datos meteorológicos pendientes de actualización</p> : null}
      <header className={`rounded-2xl border-2 p-5 ${caducado ? "border-stone-300 bg-stone-100 opacity-60" : esCritica ? "border-red-300 bg-red-50" : alerta.severidad === "alerta" ? "border-amber-300 bg-amber-50" : "border-yellow-300 bg-yellow-50"}`}>
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-700">
          <span aria-hidden="true" className="text-lg">{icon}</span> {tituloUpper}
        </p>
        <p className="mt-1 text-base font-semibold text-stone-900">{subtituloDeAlerta(alerta.tipo)}</p>

        {metricas.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {metricas.map((metrica) => (
              <div key={metrica.etiqueta} className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-stone-600">{metrica.etiqueta}</p>
                <p
                  title={metrica.temperaturaC !== undefined ? etiquetaTermica(metrica.temperaturaC) : undefined}
                  className={`mt-1 text-2xl font-extrabold ${metrica.temperaturaC !== undefined ? colorTemperatura(metrica.temperaturaC) : "text-stone-900"}`}
                >
                  {metrica.valor}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </header>

      <section className="rounded-2xl border-2 border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-bold text-stone-900">¿Por qué aparece esta alerta?</h3>
        <p className="mt-2 text-base leading-relaxed text-stone-800">
          {alerta.mensaje}
        </p>
        {alerta.datosUtilizados?.length ? (
          <p className="mt-2 text-sm leading-snug text-stone-600">Datos: {alerta.datosUtilizados.join(" · ")}</p>
        ) : null}
        <p className="mt-2 text-sm leading-snug text-stone-700">Umbral para tu cultivo y fase actual. No sustituye criterio técnico.</p>
      </section>

      <section className="rounded-2xl border-2 border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-bold text-stone-900">Tu cultivo</h3>
        <p className="mt-1 flex items-center gap-2 text-base font-semibold text-stone-800"><span aria-hidden="true">🌱</span> {alerta.cultivo ? alerta.cultivo.charAt(0).toUpperCase() + alerta.cultivo.slice(1) : "Sin especificar"}</p>
        {alerta.fenofase ? <p className="mt-1 inline-flex rounded-full bg-brand-100 px-3 py-1 text-sm font-bold text-brand-800">{alerta.fenofase}</p> : null}
      </section>

      <section className="rounded-2xl border-2 border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-bold text-stone-900">Datos utilizados</h3>
        <p className="mt-2 flex items-center gap-2 text-sm font-medium text-stone-800"><span aria-hidden="true">📡</span> Fuente: {alerta.fuente.nombre}</p>
        <a href={alerta.fuente.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-[44px] items-center text-sm font-semibold text-brand-800 underline"> {alerta.fuente.url} ↗</a>
        <p className="mt-2 text-sm font-medium text-stone-600">Actualización: {actualizacion}</p>
        {alerta.vigenciaHasta ? <p className="text-sm text-stone-600">Vigente hasta: {alerta.vigenciaHasta}</p> : null}
      </section>

      <CtaContextual alertas={[alerta]} />
    </div>
  );
}
