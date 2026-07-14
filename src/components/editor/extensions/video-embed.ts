import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    videoEmbed: {
      insertVideo: (src: string, provider?: "youtube" | "vimeo" | "mp4") => ReturnType;
    };
  }
}

export const VideoEmbed = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,
  addAttributes() {
    return { src: { default: "" }, provider: { default: "youtube" } };
  },
  parseHTML() { return [{ tag: "div[data-type='video-embed']" }]; },
  renderHTML({ HTMLAttributes, node }) {
    const attrs = {
      "data-type": "video-embed",
      "data-provider": node.attrs.provider,
      "data-src": node.attrs.src,
      class: "jt-video",
    };
    if (node.attrs.provider === "mp4") {
      return ["div", mergeAttributes(HTMLAttributes, attrs), ["video", { src: node.attrs.src, controls: "true", playsinline: "true" }]];
    }
    return ["div", mergeAttributes(HTMLAttributes, attrs), ["iframe", { src: node.attrs.src, allowfullscreen: "true", frameborder: "0", loading: "lazy" }]];
  },
  addCommands() {
    return {
      insertVideo: (src, provider = "youtube") => ({ commands }) =>
        commands.insertContent({ type: this.name, attrs: { src, provider } }),
    };
  },
});