export const ogImageSize = { width: 1200, height: 630 };
export const ogImageAlt = "WorkflowCrate - Original n8n workflow templates to buy and download";

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
        background: "#07070c",
        backgroundImage:
          "radial-gradient(700px 400px at 30% -10%, rgba(124,92,255,0.22), transparent 65%), radial-gradient(600px 360px at 78% -14%, rgba(56,133,246,0.12), transparent 60%)",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 104,
            height: 104,
            borderRadius: 26,
            background: "linear-gradient(135deg, #8B6CFF 0%, #5B3AF0 100%)",
          }}
        >
          <svg width="72" height="72" viewBox="0 0 32 32" fill="none">
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
        <div style={{ display: "flex", fontSize: 76, fontWeight: 700, color: "#f4f4f5", letterSpacing: -2 }}>
          Workflow
          <span style={{ color: "#a78bfa" }}>Crate</span>
        </div>
      </div>
      <div style={{ display: "flex", marginTop: 30, fontSize: 32, color: "#b6b6c8" }}>
        Original n8n workflows, documented end to end
      </div>
      <div style={{ display: "flex", marginTop: 42, fontSize: 24, color: "#77778c" }}>
        10,000+ original templates · instant download
      </div>
    </div>
  );
}
