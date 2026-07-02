import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4f46e5",
          borderRadius: 40,
          color: "#ffffff",
          fontSize: 108,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        W
      </div>
    ),
    { ...size }
  );
}
