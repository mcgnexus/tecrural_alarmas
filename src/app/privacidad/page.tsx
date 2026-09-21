import type { Metadata } from "next";
import { VERSION_CONSENTIMIENTO } from "@/lib/privacidad/consentimiento";
import { EMAIL_CONTACTO } from "@/lib/config/contacto";

export const metadata: Metadata = { title: "Privacidad", description: "Política de privacidad TecRural" };

export default function PrivacidadPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
      <header className="rounded-2xl border-2 border-stone-900 bg-white p-5">
        <h1 className="text-2xl font-extrabold text-stone-900">Privacidad</h1>
        <p className="mt-1 text-sm text-stone-600">Versión {VERSION_CONSENTIMIENTO} · Revisión RGPD/LOPDGDD pendiente de validación legal.</p>
      </header>
      <section className="rounded-2xl border-2 border-stone-200 bg-white p-5">
        <h2 className="text-base font-bold text-stone-900">Finalidad clara</h2>
        <p className="mt-1 text-sm leading-snug text-stone-700">Tratamos tus datos solo para generar alertas agroclimáticas para tus parcelas.</p>
        <h2 className="mt-4 text-base font-bold text-stone-900">Minimización</h2>
        <p className="mt-1 text-sm leading-snug text-stone-700">Solo nombre, municipio, cultivo, parcelas y contacto si lo facilitas.</p>
        <h2 className="mt-4 text-base font-bold text-stone-900">Consentimiento explícito</h2>
        <p className="mt-1 text-sm leading-snug text-stone-700">Debes marcar la casilla de privacidad. La alerta no equivale a publicidad.</p>
        <h2 className="mt-4 text-base font-bold text-stone-900">Comunicaciones comerciales</h2>
        <p className="mt-1 text-sm leading-snug text-stone-700">Casilla separada, opcional y revocable. Guardamos consent_version y consent_timestamp.</p>
        <h2 className="mt-4 text-base font-bold text-stone-900">Tu cuenta</h2>
        <p className="mt-1 text-sm leading-snug text-stone-700">Si activas tu cuenta, guardamos tus consultas, parcelas y avisos asociados para que los tengas siempre disponibles. Puedes descargar tus datos o borrar tu cuenta desde <a href="/cuenta" className="font-semibold underline">Mi cuenta</a>.</p>
        <h2 className="mt-4 text-base font-bold text-stone-900">Derechos</h2>
        <p className="mt-1 text-sm leading-snug text-stone-700">Acceso, rectificación, supresión y oposición en {EMAIL_CONTACTO} o desde Mi cuenta.</p>
      </section>
    </div>
  );
}
