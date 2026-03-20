import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  preflight: true,
  include: ["./src/**/*.{js,jsx,ts,tsx}"],
  exclude: [],
  theme: {
    extend: {
      tokens: {
        colors: {
          bg: { primary: { value: "#0b1120" }, card: { value: "#131a2e" }, cardHover: { value: "#1a2340" } },
          accent: { yellow: { value: "#facc15" }, blue: { value: "#38bdf8" } },
          prob: { high: { value: "#22c55e" }, mid: { value: "#facc15" }, low: { value: "#ef4444" } },
          text: { primary: { value: "#e2e8f0" }, secondary: { value: "#94a3b8" }, muted: { value: "#64748b" } },
          border: { DEFAULT: { value: "#1e293b" }, active: { value: "#38bdf8" } },
          error: { value: "#ef4444" },
        },
        fonts: {
          body: { value: "'Noto Sans JP', sans-serif" },
          mono: { value: "'JetBrains Mono', 'Fira Code', monospace" },
        },
      },
    },
  },
  globalCss: {
    "html, body": {
      bg: "bg.primary",
      color: "text.primary",
      fontFamily: "body",
      lineHeight: "1.7",
      minHeight: "100vh",
    },
    "*": {
      boxSizing: "border-box",
    },
  },
  outdir: "styled-system",
});
