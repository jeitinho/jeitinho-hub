import { Font } from "@react-pdf/renderer";

// react-pdf needs real font binaries (not the Google Fonts CSS2 endpoint used
// by the web app in src/routes/__root.tsx). Fontsource mirrors the same
// families as static, predictably-named files — no hash lookup needed.
const FONTSOURCE = "https://cdn.jsdelivr.net/fontsource/fonts";

/** Font stacks for PDF styles: the brand family first, Cyrillic fallback second. */
export const PDF_SANS = ["Inter", "InterCyrillic"];
export const PDF_SERIF = ["Fraunces", "InterCyrillic"];

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
      { src: `${FONTSOURCE}/fraunces@latest/latin-400-italic.ttf`, fontWeight: 400, fontStyle: "italic" },
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

  // Fraunces and the Inter files above are Latin-only. Russian PDFs need Cyrillic
  // glyphs: PDF_SANS / PDF_SERIF list this family as a fallback, used only for
  // characters the first family lacks, so Latin-script documents are unchanged.
  //
  // react-pdf resolves EVERY family of a stack for each style used, and throws
  // ("Could not resolve font for InterCyrillic … italic") when one has no face
  // for that style. So the fallback must answer every weight × style the PDFs
  // use: italic requests reuse the upright files (Cyrillic italic is never
  // needed in practice; the Latin text keeps Fraunces' real italic).
  const cyr = (w: number) => `${FONTSOURCE}/inter@latest/cyrillic-${w}-normal.ttf`;
  Font.register({
    family: "InterCyrillic",
    fonts: [400, 500, 600, 700].flatMap((w) => [
      { src: cyr(w), fontWeight: w },
      { src: cyr(w), fontWeight: w, fontStyle: "italic" as const },
    ]),
  });

  // Default hyphenation breaks words mid-syllable in odd places; we'd rather
  // let a long word overflow its line than mangle it.
  Font.registerHyphenationCallback((word) => [word]);
}
