import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mist: "#f1f5f9",
        ocean: "#0f172a",
        coral: "#fb7185",
        sunrise: "#f59e0b",
      },
      boxShadow: {
        lift: "0 20px 50px rgba(15, 23, 42, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
