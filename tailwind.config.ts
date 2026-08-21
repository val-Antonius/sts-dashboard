import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "var(--bg-base)",
        surface: "var(--surface)",
        "surface-hover": "var(--surface-hover)",
        border: "var(--border-subtle)",
        ink: {
          primary: "var(--ink-primary)",
          muted: "var(--ink-muted)",
        },
        accent: {
          brass: "var(--accent-brass)",
        },
        status: {
          ok: "var(--status-ok)",
          warn: "var(--status-warn)",
          danger: "var(--status-danger)",
          neutral: "var(--status-neutral)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
