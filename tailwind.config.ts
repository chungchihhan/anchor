import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      transitionDuration: {
        "260": "260ms",
      },
      typography: {
        DEFAULT: {
          css: {
            "code::before": {
              content: '""',
            },
            "code::after": {
              content: '""',
            },
            code: {
              fontWeight: "400",
              backgroundColor: "transparent",
            },
            pre: {
              backgroundColor: "transparent",
            },
            "p, ul, ol": {
              marginTop: "0.5em",
              marginBottom: "0.5em",
            },
            "h1, h2, h3, h4, h5, h6": {
              marginTop: "1em",
              marginBottom: "0.5em",
            },
            li: {
              marginTop: "0.25em",
              marginBottom: "0.25em",
            },
          },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
export default config;
