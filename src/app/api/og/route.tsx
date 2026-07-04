import { ImageResponse } from "next/og";
import React from "react";

export const runtime = "edge";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const title = (url.searchParams.get("title") || "WorkflowCrate").slice(0, 120);
    const category = (url.searchParams.get("category") || "").slice(0, 40);
    const nodes = url.searchParams.get("nodes") || "";

  const badgeRow: React.ReactNode[] = [];
    if (category) {
          badgeRow.push(
                  React.createElement(
                            "div",
                    { key: "cat", style: { display: "flex", padding: "8px 20px", borderRadius: 999, background: "rgba(99,102,241,0.15)", color: "#818cf8", fontSize: 26, fontWeight: 600 } },
                            category
                          )
                );
    }
    if (nodes) {
          badgeRow.push(
                  React.createElement(
                            "div",
                    { key: "nodes", style: { display: "flex", padding: "8px 20px", borderRadius: 999, background: "rgba(255,255,255,0.06)", color: "#a1a1aa", fontSize: 26, fontWeight: 600 } },
                            nodes + " nodes"
                          )
                );
    }

  return new ImageResponse(
        React.createElement(
                "div",
          { style: { width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#07070b", fontFamily: "sans-serif", padding: 72 } },
                React.createElement(
                          "div",
                  { style: { display: "flex", alignItems: "center", gap: 16 } },
                          React.createElement(
                                      "div",
                            { style: { display: "flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 14, background: "#4f46e5", color: "#ffffff", fontSize: 32, fontWeight: 700 } },
                                      "W"
                                    ),
                          React.createElement(
                                      "div",
                            { style: { display: "flex", fontSize: 34, fontWeight: 700, color: "#f4f4f5" } },
                                      "Workflow",
                                      React.createElement("span", { style: { color: "#818cf8" } }, "Crate")
                                    )
                        ),
                React.createElement(
                          "div",
                  { style: { display: "flex", flexDirection: "column", gap: 24 } },
                          React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 12 } }, ...badgeRow),
                          React.createElement(
                                      "div",
                            { style: { display: "flex", fontSize: 54, fontWeight: 700, color: "#f4f4f5", lineHeight: 1.2 } },
                                      title
                                    )
                        ),
                React.createElement(
                          "div",
                  { style: { display: "flex", fontSize: 24, color: "#71717a" } },
                          "Original, ready-to-import n8n workflow"
                        )
              ),
    { width: 1200, height: 630 }
      );
}
