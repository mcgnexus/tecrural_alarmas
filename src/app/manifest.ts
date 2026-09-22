import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TecRural Campo",
    short_name: "TecRural",
    description:
      "Consulta riesgos meteorológicos y agrícolas según tu ubicación y cultivo.",
    lang: "es",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f5f1",
    theme_color: "#14532d",
    icons: [
      {
        src: "/logo-tecrural.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "monochrome",
      },
    ],
  };
}
