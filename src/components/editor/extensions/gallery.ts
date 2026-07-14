import { Node, mergeAttributes } from "@tiptap/core";

export type GalleryImage = { url: string; alt?: string; caption?: string; media_id?: string };

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    gallery: {
      insertGallery: (images: GalleryImage[]) => ReturnType;
    };
  }
}

export const Gallery = Node.create({
  name: "gallery",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      images: {
        default: [] as GalleryImage[],
        parseHTML: (el) => {
          const raw = el.getAttribute("data-images");
          try { return raw ? JSON.parse(raw) : []; } catch { return []; }
        },
        renderHTML: (attrs) => ({ "data-images": JSON.stringify(attrs.images ?? []) }),
      },
    };
  },
  parseHTML() { return [{ tag: "div[data-type='gallery']" }]; },
  renderHTML({ HTMLAttributes, node }) {
    const images = (node.attrs.images as GalleryImage[]) ?? [];
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "gallery", class: "jt-gallery" }),
      ...images.map((img) => [
        "figure",
        { class: "jt-gallery-item" },
        ["img", { src: img.url, alt: img.alt ?? "", loading: "lazy" }],
        ["figcaption", {}, img.caption ?? ""],
      ]),
    ];
  },
  addCommands() {
    return {
      insertGallery: (images) => ({ commands }) => commands.insertContent({ type: this.name, attrs: { images } }),
    };
  },
});