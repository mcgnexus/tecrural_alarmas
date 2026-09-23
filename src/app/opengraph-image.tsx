import { ImageResponse } from "next/og";

export const alt = "Avisos de helada y viento para tu cultivo, gratis";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "64px",
          background: "#14532d",
          color: "#fffaf0",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: 270,
            height: 270,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 36,
            background: "#fffaf0",
            marginRight: 58,
          }}
        >
          <svg width="220" height="220" viewBox="0 0 256 256" fill="none">
            <g fill="#178447">
              <path d="M126 145C91 119 74 83 78 42c43 3 76 27 82 67 3 18-3 32-12 45-7-28-19-52-42-74 18 24 27 43 20 65Z" />
              <path d="M132 133c-9-48 11-91 48-113 20-12 42-17 64-18 2 34-3 68-22 93-21 27-53 40-90 38 22-26 46-48 74-68-32 19-54 39-74 68Z" />
              <path d="M130 125c-4 50-13 78-42 94 34-4 52-25 59-68 2-12 3-23 3-34Z" />
            </g>
            <g stroke="#16a8cf" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7">
              <path d="M130 125v37m0 0-25 22m25-22 28 22m-28-22-1 34m1-34 1 34-24 21m24-21 29 22m-29-22v31" />
              <path d="m105 184-24 20m24-20 2 27m51-27 25 20m-25-20-1 27m-25-5-19 16m19-16 20 16" />
            </g>
            <g fill="#16a8cf">
              <circle cx="81" cy="204" r="7" />
              <circle cx="106" cy="211" r="7" />
              <circle cx="180" cy="204" r="7" />
              <circle cx="155" cy="211" r="7" />
              <circle cx="86" cy="220" r="7" />
              <circle cx="130" cy="231" r="7" />
              <circle cx="175" cy="220" r="7" />
            </g>
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#bbf7d0", marginBottom: 24 }}>
            TECRURAL CAMPO
          </div>
          <div style={{ fontSize: 58, lineHeight: 1.08, fontWeight: 800, letterSpacing: -1 }}>
            Avisos de helada y viento
          </div>
          <div style={{ fontSize: 52, lineHeight: 1.12, fontWeight: 800, color: "#f5e8c8", marginTop: 8 }}>
            para tu cultivo, gratis
          </div>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              marginTop: 34,
              borderRadius: 999,
              background: "#166534",
              border: "2px solid #86efac",
              padding: "12px 22px",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            Gratis · Avisos por WhatsApp
          </div>
        </div>
      </div>
    ),
    size,
  );
}
