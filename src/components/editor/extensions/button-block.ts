import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    buttonBlock: {
      insertButton: (label: string, href: string, variant?: "primary" | "secondary") => ReturnType;
    };
  }
}

export const ButtonBlock = Node.create({
  name: "buttonBlock",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      label: { default: "En savoir plus" },
      href: { default: "#" },
      variant: { default: "primary" },
    };
  },
  parseHTML() { return [{ tag: "a[data-type='button-block']" }]; },
  renderHTML({ HTMLAttributes, node }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-type": "button-block",
        class: `jt-btn jt-btn-${node.attrs.variant}`,
        href: node.attrs.href,
      }),
      node.attrs.label as string,
    ];
  },
  addCommands() {
    return {
      insertButton: (label, href, variant = "primary") => ({ commands }) =>
        commands.insertContent({ type: this.name, attrs: { label, href, variant } }),
    };
  },
});