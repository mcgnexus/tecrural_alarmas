import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ServiceWorkerRegistrator } from "@/components/pwa/service-worker-registrator";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tecrural.es";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Avisos de helada y viento para tu cultivo · Granada",
    template: "%s | TecRural Campo",
  },
  description:
    "Consulta el tiempo municipal y recibe avisos gratuitos de helada y viento para tu cultivo en Granada. Previsión sencilla y alertas por WhatsApp.",
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "TecRural Campo",
    title: "Avisos de helada y viento para tu cultivo · Granada",
    description:
      "Consulta el tiempo municipal y recibe avisos gratuitos de helada y viento para tu cultivo en Granada. Previsión sencilla y alertas por WhatsApp.",
    images: [{ url: new URL("/opengraph-image", siteUrl), width: 1200, height: 630, alt: "Avisos de helada y viento para tu cultivo, gratis" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Avisos de helada y viento para tu cultivo · Granada",
    description:
      "Consulta el tiempo municipal y recibe avisos gratuitos de helada y viento para tu cultivo en Granada. Previsión sencilla y alertas por WhatsApp.",
    images: [new URL("/opengraph-image", siteUrl)],
  },
  robots: {
    index: true,
    follow: true,
  },
  applicationName: "TecRural Campo",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TecRural Campo",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#14532d",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
        <ServiceWorkerRegistrator />
        <Analytics />
      </body>
    </html>
  );
}
