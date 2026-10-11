import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        obsidian: {
          canvas: "#07090E",
          950: "#07090E",
          900: "#090D15",
          850: "#0D121D",
          800: "#121927",
          700: "#1B2436",
        },
        void: "#07090E",
        glass: {
          surface: "rgba(255, 255, 255, 0.025)",
          raised: "rgba(255, 255, 255, 0.045)",
          highlight: "rgba(255, 255, 255, 0.10)",
          border: "rgba(255, 255, 255, 0.07)",
          borderHover: "rgba(255, 255, 255, 0.14)",
        },
        accent: {
          mint: "#10B981",
          amber: "#F59E0B",
          crimson: "#EF4444",
          cerulean: "#3B82F6",
          sky: "#38BDF8",
          slate: "#64748B",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Instrument Serif", "Georgia", "serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "Geist Mono", "Menlo", "monospace"],
      },
      boxShadow: {
        "glass-sm": "0 2px 8px 0 rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
        "glass-md": "0 8px 32px 0 rgba(0, 0, 0, 0.36), inset 0 1px 0 0 rgba(255, 255, 255, 0.10)",
        "glass-lg": "0 12px 40px 0 rgba(0, 0, 0, 0.48), inset 0 1px 0 0 rgba(255, 255, 255, 0.12)",
        "subtle-card": "0 8px 32px 0 rgba(0, 0, 0, 0.36)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.02)" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(1000%)" },
        },
        liquidShimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "pulse-glow": "pulseGlow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        scanline: "scanline 6s linear infinite",
        "liquid-shimmer": "liquidShimmer 8s ease infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
