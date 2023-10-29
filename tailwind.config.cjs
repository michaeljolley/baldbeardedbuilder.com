/** @type {import('tailwindcss').Config} */
import plugin from "tailwindcss/plugin";

module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        neon: "#67E565",
        fadedNeon: "rgba(112, 255, 0, .5)",
        darkGray: "#121416",
        white: "#fff",
        fadedGray: "rgba(60, 60 , 60, .75)",
        muted: "rgba(100, 100, 100, .05)",
        darken: "#0E0F11",
        gradientGray:
          "linear-gradient(90deg, rgba(148, 148, 148, 100), rgba(148, 148, 148, 0), rgba(148, 148, 148, 100))",
        gradientColor:
          "linear-gradient(45deg, rgb(26, 219, 187), rgb(20, 165, 237), rgb(127, 100, 251), rgb(243, 50, 101), rgb(255, 175, 132), rgb(255, 118, 108))",
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
        kanit: ["Kanit", "sans-serif"],
      },
    },
  },
  plugins: [
    plugin(function ({ addComponents }) {
      addComponents({
        ".border-gradient": {
          "border-image-slice": "1",
          "border-width": "2px",
          "border-image-source":
            "linear-gradient(100deg, rgba(148, 148, 148, 1), rgba(148, 148, 148, 0), rgba(148, 148, 148, 100))",
        },
      });
    }),
  ],
};
