import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Callout } from "./extensions/callout";
import { FaqItem, FaqQuestion, FaqAnswer, FaqCommands } from "./extensions/faq";
import { Gallery, type GalleryImage } from "./extensions/gallery";
import { ButtonBlock } from "./extensions/button-block";
import { VideoEmbed } from "./extensions/video-embed";
import { MediaPicker } from "./media-picker";
import { EditorToolbar } from "./toolbar";
import "./editor.css";

function toVideoEmbed(url: string): { src: string; provider: "youtube" | "vimeo" | "mp4" } {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  if (yt) return { src: `https://www.youtube.com/embed/${yt[1]}`, provider: "youtube" };
  const vim = url.match(/vimeo\.com\/(\d+)/);
  if (vim) return { src: `https://player.vimeo.com/video/${vim[1]}`, provider: "vimeo" };
  if (/\.mp4($|\?)/.test(url)) return { src: url, provider: "mp4" };
  return { src: url, provider: "youtube" };
}

export function TiptapEditor({
  value,
  onChange,
  placeholder,
}: {
  value: unknown;
  onChange: (json: unknown) => void;
  placeholder?: string;
}) {
  const [picker, setPicker] = useState<null | "image" | "gallery">(null);

  const initial = useMemo(() => {
    if (!value) return { type: "doc", content: [{ type: "paragraph" }] };
    if (typeof value === "string" && value.trim().startsWith("{")) {
      try { return JSON.parse(value); } catch { /* fallthrough */ }
    }
    if (typeof value === "object") return value as object;
    return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: String(value ?? "") }] }] };
  }, [value]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Image.configure({ HTMLAttributes: { class: "jt-inline-image" } }),
      Placeholder.configure({ placeholder: placeholder ?? "Commencez à écrire, ou utilisez la barre d'outils pour insérer un bloc…", emptyEditorClass: "jt-placeholder" }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      Callout, FaqItem, FaqQuestion, FaqAnswer, FaqCommands,
      Gallery, ButtonBlock, VideoEmbed,
    ],
    content: initial,
    editorProps: { attributes: { class: "jt-editor" } },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(initial)) {
      editor.commands.setContent(initial as never, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, editor]);

  const onInsertLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL du lien", previous ?? "https://");
    if (url === null) return;
    if (url === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const onInsertButton = useCallback(() => {
    if (!editor) return;
    const label = window.prompt("Texte du bouton", "En savoir plus");
    if (!label) return;
    const href = window.prompt("Lien du bouton", "https://jeitinho.fr");
    if (!href) return;
    editor.chain().focus().insertButton(label, href, "primary").run();
  }, [editor]);

  const onInsertVideo = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("URL YouTube, Vimeo ou MP4");
    if (!url) return;
    const { src, provider } = toVideoEmbed(url);
    editor.chain().focus().insertVideo(src, provider).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="space-y-2">
      <EditorToolbar
        editor={editor}
        onPickImage={() => setPicker("image")}
        onPickGallery={() => setPicker("gallery")}
        onInsertLink={onInsertLink}
        onInsertButton={onInsertButton}
        onInsertVideo={onInsertVideo}
      />
      <EditorContent editor={editor} />
      <MediaPicker
        open={picker === "image"}
        onClose={() => setPicker(null)}
        onPick={(items) => {
          const it = items[0];
          if (it) editor.chain().focus().setImage({ src: it.url, alt: it.alt ?? "" }).run();
        }}
        filterKind="image"
      />
      <MediaPicker
        open={picker === "gallery"}
        onClose={() => setPicker(null)}
        multiple
        onPick={(items) => {
          const imgs: GalleryImage[] = items.map((m) => ({ url: m.url, alt: m.alt ?? undefined, caption: m.caption ?? undefined, media_id: m.id.startsWith("url:") ? undefined : m.id }));
          editor.chain().focus().insertGallery(imgs).run();
        }}
        filterKind="image"
      />
    </div>
  );
}