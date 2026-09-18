import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TecRural Campo",
    short_name: "TecRural",
    description:
      "Riesgos agroclimáticos para tu parcela y cultivo, explicados de forma sencilla.",
    lang: "es",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f5f1",
    theme_color: "#14532d",
    icons: [
      {
        src: "/icons/icon.svg",
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
    ],
  };
}