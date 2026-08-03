import { Font } from "@react-pdf/renderer";

// react-pdf needs real font binaries (not the Google Fonts CSS2 endpoint used
// by the web app in src/routes/__root.tsx). Fontsource mirrors the same
// families as static, predictably-named files — no hash lookup needed.
const FONTSOURCE = "https://cdn.jsdelivr.net/fontsource/fonts";

let registered = false;

export function registerQuotePdfFonts() {
  if (registered) return;
  registered = true;

  Font.register({
    family: "Fraunces",
    fonts: [
      { src: `${FONTSOURCE}/fraunces@latest/latin-400-normal.ttf`, fontWeight: 400 },
      { src: `${FONTSOURCE}/fraunces@latest/latin-500-normal.ttf`, fontWeight: 500 },
      { src: `${FONTSOURCE}/fraunces@latest/latin-600-normal.ttf`, fontWeight: 600 },
    ],
  });

  Font.register({
    family: "Inter",
    fonts: [
      { src: `${FONTSOURCE}/inter@latest/latin-400-normal.ttf`, fontWeight: 400 },
      { src: `${FONTSOURCE}/inter@latest/latin-500-normal.ttf`, fontWeight: 500 },
      { src: `${FONTSOURCE}/inter@latest/latin-600-normal.ttf`, fontWeight: 600 },
      { src: `${FONTSOURCE}/inter@latest/latin-700-normal.ttf`, fontWeight: 700 },
    ],
  });

  // Default hyphenation breaks words mid-syllable in odd places; we'd rather
  // let a long word overflow its line than mangle it.
  Font.registerHyphenationCallback((word) => [word]);
}
