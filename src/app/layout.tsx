import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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
    default: "TecRural Campo",
    template: "%s · TecRural Campo",
  },
  description:
    "Riesgos agroclimáticos para tu parcela y cultivo, explicados de forma sencilla.",
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "TecRural Campo",
    title: "TecRural Campo | Alertas para tu cultivo",
    description:
      "Riesgos agroclimáticos para tu parcela y cultivo, explicados de forma sencilla.",
  },
  twitter: {
    card: "summary",
    title: "TecRural Campo | Alertas para tu cultivo",
    description:
      "Riesgos agroclimáticos para tu parcela y cultivo, explicados de forma sencilla.",
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
        <Analytics />
      </body>
    </html>
  );
}
