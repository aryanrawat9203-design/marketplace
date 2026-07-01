export const ogImageSize = { width: 1200, height: 630 };
export const ogImageAlt = "FlowDex - Original n8n workflow templates to buy and download";

export function OgImageContent() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#07070b",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 96,
            height: 96,
            borderRadius: 24,
            background: "linear-gradient(135deg, #8b5cf6, #d946ef)",
            color: "#ffffff",
            fontSize: 56,
            fontWeight: 700,
          }}
        >
          F
        </div>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: "#f4f4f5" }}>
          Flow
          <span style={{ color: "#c084fc" }}>Dex</span>
        </div>
      </div>
      <div style={{ display: "flex", marginTop: 28, fontSize: 32, color: "#a1a1aa" }}>
        Ready-to-use n8n workflows, built to sell
      </div>
      <div style={{ display: "flex", marginTop: 40, fontSize: 24, color: "#71717a" }}>
        10,000+ original templates &middot; instant download
      </div>
    </div>
  );
}
