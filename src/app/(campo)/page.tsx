import Link from "next/link";
import { HomeSinRegistro } from "@/components/campo/home-sin-registro";
import type { Metadata } from "next";
import { EMAIL_CONTACTO } from "@/lib/config/contacto";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

// La portada es igual para todos: datos meteorológicos y ubicación se cargan
// desde el cliente. ISR evita renderizarla en frío en cada primera visita.
export const revalidate = 3600;

const datosEstructurados = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "TecRural Campo",
      url: "https://tecrural.es",
      logo: "https://tecrural.es/TecRural_icono.png",
      founder: { "@type": "Person", name: "Manuel Carrasco García", address: { "@type": "PostalAddress", addressLocality: "Huéscar", addressRegion: "Granada", addressCountry: "ES" } },
      email: EMAIL_CONTACTO,
    },
    {
      "@type": "WebSite",
      name: "TecRural Campo",
      url: "https://tecrural.es",
      inLanguage: "es-ES",
    },
  ],
};

export default function InicioPage() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datosEstructurados) }} />
    <HomeSinRegistro />
    <p className="text-center text-[13px] leading-relaxed text-stone-600">TecRural no sustituye a AEMET, RAIF ni a un técnico agrícola. Consulta nuestra <Link href="/privacidad" className="inline-flex min-h-11 items-center py-2 font-bold text-olive-800 underline">política de privacidad</Link>.</p>
  </>;
}
