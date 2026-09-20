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

export default async function GestionPage({
  searchParams,
}: {
  searchParams: Promise<{ secret?: string; admin_secret?: string }>;
}) {
  const params = await searchParams;
  const secret = params.admin_secret?.trim() || params.secret?.trim() || "";
  const cabeceras = await headers();
  const req = new Request(`http://localhost/gestion${secret ? `?admin_secret=${encodeURIComponent(secret)}` : ""}`, {
    headers: cabeceras,
  });
  if (!verificarAccesoAdmin(req).ok) redirect("/admin");

  return (
    <>
      <section>
        <h1 className="text-lg font-semibold text-stone-800">Gestión</h1>
        <p className="mt-1 text-[13px] text-stone-500">
          Administra el catálogo fenológico (con sus Kc), valida coeficientes y
          define reglas de riesgo por cultivo o estado.
        </p>
      </section>

      <GestionCatalogo adminSecret={secret} />
      <GestionReglas adminSecret={secret} />
    </>
  );
}
