export function SeccionConfianza() {
  return (
    <section className="rounded-2xl border-2 border-earth-300 bg-white p-5 shadow-sm" aria-labelledby="confianza-titulo">
      <p className="text-[15px] font-bold uppercase tracking-wide text-olive-700">Conoce cómo trabajamos</p>
      <h2 id="confianza-titulo" className="mt-1 text-2xl font-extrabold text-stone-950">Una ayuda cercana y pensada para el campo</h2>
      <p className="mt-3 max-w-3xl text-base leading-relaxed text-stone-700">
        TecRural reúne información agroclimática y fitosanitaria para ayudarte a entender mejor lo que ocurre en tu zona y tomar decisiones con más contexto.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border-2 border-earth-200 bg-wheat-50 p-4">
          <h3 className="font-extrabold text-stone-950">Fuentes identificadas</h3>
          <p className="mt-1 text-[15px] leading-relaxed text-stone-700">Usamos información de AEMET, RAIF y datos meteorológicos para elaborar los avisos disponibles.</p>
        </article>
        <article className="rounded-xl border-2 border-earth-200 bg-wheat-50 p-4">
          <h3 className="font-extrabold text-stone-950">Explicado sin tecnicismos</h3>
          <p className="mt-1 text-[15px] leading-relaxed text-stone-700">Convertimos la información disponible en avisos claros y fáciles de entender.</p>
        </article>
        <article className="rounded-xl border-2 border-earth-200 bg-wheat-50 p-4">
          <h3 className="font-extrabold text-stone-950">Enfocado al campo</h3>
          <p className="mt-1 text-[15px] leading-relaxed text-stone-700">La experiencia está pensada para las necesidades de agricultores y ganaderos.</p>
        </article>
        <article className="rounded-xl border-2 border-earth-200 bg-wheat-50 p-4">
          <h3 className="font-extrabold text-stone-950">Contacto cercano</h3>
          <p className="mt-1 text-[15px] leading-relaxed text-stone-700">Puedes dejar tus datos para que el equipo revise tu solicitud y te contacte por WhatsApp.</p>
        </article>
      </div>
      <p className="mt-5 border-t border-earth-200 pt-4 text-sm leading-relaxed text-stone-600">
        TecRural ofrece información orientativa y no sustituye la valoración de un técnico agrícola ni los avisos oficiales.
      </p>
    </section>
  );
}
