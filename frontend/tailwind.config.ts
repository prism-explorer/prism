import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        prism: {
          bg: "#080B10",
          surface: "#0F1420",
          border: "#1E2535",
          accent: "#4F8EF7",
          green: "#22C55E",
          red: "#EF4444",
          muted: "#6B7280",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
