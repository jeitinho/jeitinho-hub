import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutVariant = "conseil" | "aeviter" | "bonasavoir";

const LABELS: Record<CalloutVariant, string> = {
  conseil: "Conseil",
  aeviter: "À éviter",
  bonasavoir: "Bon à savoir",
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (variant: CalloutVariant) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      variant: {
        default: "conseil" as CalloutVariant,
        parseHTML: (el) => el.getAttribute("data-variant") ?? "conseil",
        renderHTML: (attrs) => ({ "data-variant": attrs.variant }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-type='callout']" }];
  },
  renderHTML({ HTMLAttributes, node }) {
    const variant = (node.attrs.variant as CalloutVariant) ?? "conseil";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "callout",
        "data-variant": variant,
        class: `jt-callout jt-callout-${variant}`,
      }),
      ["div", { class: "jt-callout-label", contenteditable: "false" }, LABELS[variant]],
      ["div", { class: "jt-callout-body" }, 0],
    ];
  },
  addCommands() {
    return {
      setCallout:
        (variant) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { variant }),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});