import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Favicon — mirrors the LogoMark in components/Logo.tsx. */
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
          background: "linear-gradient(135deg, #8B6CFF 0%, #5B3AF0 100%)",
          borderRadius: 44,
        }}
      >
        <svg width="128" height="128" viewBox="0 0 32 32" fill="none">
          <path
            d="M9.2 20.6 16.4 11.6 M16.4 11.6 23 19.4"
            stroke="white"
            strokeOpacity="0.9"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <circle cx="9.2" cy="20.6" r="2.7" fill="white" />
          <circle cx="16.4" cy="11.6" r="3" fill="white" />
          <circle cx="23" cy="19.4" r="2.7" fill="white" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
