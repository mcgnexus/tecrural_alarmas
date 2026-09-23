import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingMunicipio } from "@/components/campo/landing-municipio";
import { MUNICIPIOS_PUBLICOS, municipioPublicoPorSlug } from "@/lib/datos/municipios-publicos";

type Props = { params: Promise<{ municipio: string }> };

export function generateStaticParams() {
  return MUNICIPIOS_PUBLICOS.map(({ slug }) => ({ municipio: slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { municipio: slug } = await params;
  const municipio = municipioPublicoPorSlug(slug);
  if (!municipio) notFound();

  const title = `Avisos de helada y viento en ${municipio.name}`;
  const description = `Consulta el tiempo municipal de ${municipio.name}, Granada, y revisa los riesgos de helada y viento para tu cultivo. Previsión gratuita y avisos por WhatsApp.`;
  const canonical = `/avisos-helada-viento/${municipio.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | TecRural Campo`,
      description,
      url: canonical,
      siteName: "TecRural Campo",
      locale: "es_ES",
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Avisos de helada y viento para tu cultivo, gratis" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | TecRural Campo`,
      description,
      images: ["/opengraph-image"],
    },
  };
}

export default async function AvisosMunicipioPage({ params }: Props) {
  const { municipio: slug } = await params;
  const municipio = municipioPublicoPorSlug(slug);
  if (!municipio) notFound();

  const datosEstructurados = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Avisos de helada y viento en ${municipio.name}`,
    description: `Previsión municipal y riesgos orientativos de helada y viento para cultivos en ${municipio.name}, Granada.`,
    url: `https://tecrural.es/avisos-helada-viento/${municipio.slug}`,
    about: {
      "@type": "Place",
      name: `${municipio.name}, ${municipio.province}`,
      address: { "@type": "PostalAddress", addressLocality: municipio.name, addressRegion: "Granada", addressCountry: "ES" },
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datosEstructurados) }} />
      <LandingMunicipio municipio={municipio} />
    </>
  );
}
