import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { GestionCatalogo } from "@/components/gestion/gestion-catalogo";
import { GestionReglas } from "@/components/gestion/gestion-reglas";
import { verificarAccesoAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: "Gestión",
  description: "Catálogo fenológico, Kc y reglas de riesgo por cultivo.",
};

export default async function GestionPage() {
  // La sesión viaja en una cookie HttpOnly (la emite /api/admin/session desde
  // /admin). El secreto no se acepta por parámetro de URL, así que no queda en
  // el historial del navegador, ni en los logs del servidor, ni en el Referer.
  const cabeceras = await headers();
  const peticion = new Request("http://interno/gestion", { headers: cabeceras });
  if (!verificarAccesoAdmin(peticion).ok) redirect("/admin?next=/gestion");

  return (
    <>
      <section>
        <h1 className="text-lg font-semibold text-stone-800">Gestión</h1>
        <p className="mt-1 text-[13px] text-stone-500">
          Administra el catálogo fenológico (con sus Kc), valida coeficientes y
          define reglas de riesgo por cultivo o estado.
        </p>
      </section>

      <GestionCatalogo />
      <GestionReglas />
    </>
  );
}
