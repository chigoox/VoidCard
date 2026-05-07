import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Onyx Gold tokens — see BUILD_PLAN.md §A
        onyx: {
          950: "#0A0A0B",
          900: "#101012",
          800: "#16161A",
          700: "#1F1F25",
          600: "#2A2A33",
          500: "#3A3A45",
        },
        gold: {
          DEFAULT: "#D4AF37",
          50: "#FBF5DD",
          100: "#F5E9B0",
          200: "#EAD27A",
          300: "#DEBB44",
          400: "#D4AF37",
          500: "#B89028",
          600: "#8C6C1E",
          700: "#604A14",
        },
        ivory: {
          DEFAULT: "#F5F1E8",
          dim: "#C7C2B5",
          mute: "#8C887D",
        },
        // Trustable SaaS palette — black & white brand for the marketing site.
        ink: {
          DEFAULT: "#0A0A0A",
          900: "#0A0A0A",
          800: "#1F1F1F",
          700: "#2E2E2E",
          600: "#3F3F46",
          500: "#5F5F66",
          400: "#8E8E93",
          300: "#B0B0B6",
        },
        paper: {
          DEFAULT: "#FFFFFF",
          50: "#FAFAFB",
          100: "#F4F4F5",
          200: "#E5E5E7",
          300: "#D1D1D6",
          400: "#B0B0B6",
        },
        success: "#3FB68B",
        warning: "#E0A93B",
        danger: "#E0533F",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "1.25rem",
        pill: "9999px",
      },
      backgroundImage: {
        "gold-grad": "linear-gradient(135deg, #F5E9B0 0%, #D4AF37 50%, #8C6C1E 100%)",
        "onyx-grad": "linear-gradient(180deg, #0A0A0B 0%, #16161A 100%)",
        "paper-grad": "linear-gradient(180deg, #FFFFFF 0%, #FAFAFB 100%)",
      },
      boxShadow: {
        gold: "0 0 0 1px rgba(212,175,55,0.4), 0 8px 32px -8px rgba(212,175,55,0.25)",
        "gold-lg": "0 0 0 1px rgba(212,175,55,0.5), 0 16px 60px -12px rgba(212,175,55,0.4)",
        inset: "inset 0 1px 0 0 rgba(255,255,255,0.06)",
        soft: "0 1px 2px rgba(10,10,10,0.04), 0 4px 16px -4px rgba(10,10,10,0.08)",
        "soft-lg": "0 2px 4px rgba(10,10,10,0.04), 0 12px 40px -8px rgba(10,10,10,0.12)",
      },
      animation: {
        "shine": "shine 2.4s linear infinite",
        "fade-in": "fadeIn 240ms ease-out",
        scan: "scan 2s ease-in-out infinite",
      },
      keyframes: {
        shine: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeIn: { "0%": { opacity: "0", transform: "translateY(4px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        scan: { "0%, 100%": { top: "0%" }, "50%": { top: "calc(100% - 2px)" } },
      },
    },
  },
  plugins: [],
};

export default config;
