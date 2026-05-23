import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/**
 * Tailwind config — single source of truth for design tokens.
 *
 * Token system aligns with shadcn/ui conventions
 * (`background`, `foreground`, `card`, `muted-foreground`, etc.) so the
 * primitives in `components/ui/*` work without renaming. The hex values
 * still come from AGENTS.md §4.2 — only the *names* changed.
 *
 *   AGENTS.md role         shadcn token              hex
 *   ─────────────────────  ────────────────────────  ───────
 *   Background / canvas    background                #0D1117
 *   Surface / cards        card                      #161B22
 *   Elevated surface       popover, secondary,
 *                          muted, elevated           #1C2128
 *   Borders / dividers     border, input             #30363D
 *   Primary text           foreground                #F0F6FC
 *   Muted text             muted-foreground          #8B949E
 *   Income / success       income                    #2EA043
 *   Expense / danger       expense, destructive      #F85149
 *   Warning / neutral      warning                   #D29922
 *   Accent / brand         primary, ring, accent     #388BFD
 *
 * The `accent`, `income`, `expense`, `warning`, `elevated` tokens stay
 * available because they're either (a) referenced by chart constants
 * outside Tailwind context (`CHART_COLORS`) or (b) carry domain meaning
 * that's clearer than the shadcn equivalent in finance code.
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
        // --- shadcn surfaces / typography ---------------------------
        background: "#0D1117",
        foreground: "#F0F6FC",

        card: {
          DEFAULT: "#161B22",
          foreground: "#F0F6FC",
        },
        popover: {
          DEFAULT: "#1C2128",
          foreground: "#F0F6FC",
        },

        primary: {
          DEFAULT: "#388BFD",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#1C2128",
          foreground: "#F0F6FC",
        },
        muted: {
          DEFAULT: "#1C2128",
          foreground: "#8B949E",
        },
        destructive: {
          DEFAULT: "#F85149",
          foreground: "#FFFFFF",
        },

        border: "#30363D",
        input: "#30363D",
        ring: "#388BFD",

        // --- Domain / convenience tokens ----------------------------
        elevated: "#1C2128",
        income: "#2EA043",
        expense: "#F85149",
        warning: "#D29922",
        accent: "#388BFD",

        // --- Sidebar tokens (dashboard-01) --------------------------
        sidebar: {
          DEFAULT: "#161B22",
          foreground: "#F0F6FC",
          primary: "#388BFD",
          "primary-foreground": "#FFFFFF",
          accent: "#1C2128",
          "accent-foreground": "#F0F6FC",
          border: "#30363D",
          ring: "#388BFD",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
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
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "accordion-down": "accordion-down 200ms ease-out",
        "accordion-up": "accordion-up 200ms ease-out",
      },
    },
  },
  plugins: [animate],
};

export default config;
