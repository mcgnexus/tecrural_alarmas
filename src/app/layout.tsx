import type { Metadata, Viewport } from "next";
import Script from "next/script";
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
    default: "Tiempo y alarmas agrícolas · Granada",
    template: "%s | TecRural Campo",
  },
  description:
    "Consulta el tiempo municipal, avisos oficiales de AEMET y alarmas agrícolas de lluvia, helada y viento adaptadas a tu cultivo en Granada.",
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "TecRural Campo",
    title: "Tiempo y alarmas agrícolas · Granada",
    description:
      "Consulta el tiempo municipal, avisos oficiales de AEMET y alarmas agrícolas de lluvia, helada y viento adaptadas a tu cultivo en Granada.",
    images: [{ url: new URL("/opengraph-image", siteUrl), width: 1200, height: 630, alt: "Tiempo, avisos AEMET y alarmas agrícolas para Granada" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tiempo y alarmas agrícolas · Granada",
    description:
      "Consulta el tiempo municipal, avisos oficiales de AEMET y alarmas agrícolas de lluvia, helada y viento adaptadas a tu cultivo en Granada.",
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
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-3SXTJ9EMW6"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-3SXTJ9EMW6');`}
        </Script>
      </body>
    </html>
  );
}
