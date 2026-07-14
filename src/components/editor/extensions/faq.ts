import { Node, mergeAttributes } from "@tiptap/core";

export const FaqItem = Node.create({
  name: "faqItem",
  group: "block",
  content: "faqQuestion faqAnswer",
  defining: true,
  parseHTML() {
    return [{ tag: "div[data-type='faq-item']" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "faq-item", class: "jt-faq-item" }),
      0,
    ];
  },
});

export const FaqQuestion = Node.create({
  name: "faqQuestion",
  content: "inline*",
  defining: true,
  parseHTML() {
    return [{ tag: "div[data-type='faq-question']" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "faq-question", class: "jt-faq-question" }),
      0,
    ];
  },
});

export const FaqAnswer = Node.create({
  name: "faqAnswer",
  content: "block+",
  defining: true,
  parseHTML() {
    return [{ tag: "div[data-type='faq-answer']" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "faq-answer", class: "jt-faq-answer" }),
      0,
    ];
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    faq: {
      insertFaqItem: () => ReturnType;
    };
  }
}

export const FaqCommands = Node.create({
  name: "faqCommands",
  addCommands() {
    return {
      insertFaqItem:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: "faqItem",
            content: [
              { type: "faqQuestion", content: [{ type: "text", text: "Question ?" }] },
              {
                type: "faqAnswer",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Réponse." }] }],
              },
            ],
          }),
    };
  },
});