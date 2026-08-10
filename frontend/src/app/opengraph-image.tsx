import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0b0a",
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 2px, transparent 2px)",
          backgroundSize: "36px 36px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ width: 56, height: 56, background: "#ffb020", transform: "rotate(45deg)" }} />
          <div style={{ fontSize: 88, fontWeight: 700, color: "#e9e7e1", letterSpacing: "0.02em" }}>
            PRISM
          </div>
        </div>
        <div style={{ marginTop: 26, fontSize: 30, color: "rgba(233,231,225,0.62)" }}>
          Soroban-native block explorer for the Stellar network
        </div>
      </div>
    ),
    { ...size }
  );
}
