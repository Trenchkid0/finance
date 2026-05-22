import type { Config } from "tailwindcss";

/**
 * Tailwind config — single source of truth for design tokens.
 * Mirrors AGENTS.md §4.2 (Color Palette) and §4.3 (Typography).
 *
 * Why v3 instead of v4: AGENTS.md mandates `tailwind.config.ts` as the
 * canonical token surface. Sticking with v3 keeps that contract.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#0D1117",
        surface: "#161B22",
        elevated: "#1C2128",
        border: "#30363D",
        text: {
          primary: "#F0F6FC",
          muted: "#8B949E",
        },
        income: "#2EA043",
        expense: "#F85149",
        warning: "#D29922",
        accent: "#388BFD",
      },
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "var(--font-geist-mono)",
          "JetBrains Mono",
          "ui-monospace",
          "monospace",
        ],
      },
      fontSize: {
        // Aligned to §4.3 type scale
        display: ["1.875rem", { lineHeight: "2.25rem", fontWeight: "600" }],
        heading: ["1.25rem", { lineHeight: "1.75rem", fontWeight: "500" }],
      },
      borderColor: {
        DEFAULT: "#30363D",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
