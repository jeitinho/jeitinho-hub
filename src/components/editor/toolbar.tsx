import { Editor } from "@tiptap/react";
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Link as LinkIcon, Image as ImageIcon, Table as TableIcon,
  Lightbulb, AlertTriangle, Info, HelpCircle, Images, MousePointerClick, Film, Undo2, Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function Btn({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground",
        active && "bg-accent text-foreground",
      )}
    >{children}</button>
  );
}

export function EditorToolbar({
  editor,
  onPickImage,
  onPickGallery,
  onInsertLink,
  onInsertButton,
  onInsertVideo,
}: {
  editor: Editor;
  onPickImage: () => void;
  onPickGallery: () => void;
  onInsertLink: () => void;
  onInsertButton: () => void;
  onInsertVideo: () => void;
}) {
  return (
    <div className="sticky top-2 z-10 flex flex-wrap items-center gap-0.5 rounded-lg border border-border/60 bg-card/95 p-1 backdrop-blur">
      <Btn title="Annuler" onClick={() => editor.chain().focus().undo().run()}><Undo2 className="h-4 w-4" /></Btn>
      <Btn title="Rétablir" onClick={() => editor.chain().focus().redo().run()}><Redo2 className="h-4 w-4" /></Btn>
      <div className="mx-1 h-5 w-px bg-border" />
      <Btn active={editor.isActive("heading", { level: 1 })} title="H1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></Btn>
      <Btn active={editor.isActive("heading", { level: 2 })} title="H2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Btn>
      <Btn active={editor.isActive("heading", { level: 3 })} title="H3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></Btn>
      <div className="mx-1 h-5 w-px bg-border" />
      <Btn active={editor.isActive("bold")} title="Gras" onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Btn>
      <Btn active={editor.isActive("italic")} title="Italique" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Btn>
      <Btn active={editor.isActive("strike")} title="Barré" onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></Btn>
      <div className="mx-1 h-5 w-px bg-border" />
      <Btn active={editor.isActive("bulletList")} title="Liste" onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Btn>
      <Btn active={editor.isActive("orderedList")} title="Numérotée" onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Btn>
      <Btn active={editor.isActive("blockquote")} title="Citation" onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></Btn>
      <div className="mx-1 h-5 w-px bg-border" />
      <Btn title="Lien" onClick={onInsertLink} active={editor.isActive("link")}><LinkIcon className="h-4 w-4" /></Btn>
      <Btn title="Image" onClick={onPickImage}><ImageIcon className="h-4 w-4" /></Btn>
      <Btn title="Galerie" onClick={onPickGallery}><Images className="h-4 w-4" /></Btn>
      <Btn title="Vidéo" onClick={onInsertVideo}><Film className="h-4 w-4" /></Btn>
      <Btn title="Bouton CTA" onClick={onInsertButton}><MousePointerClick className="h-4 w-4" /></Btn>
      <Btn title="Tableau" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="h-4 w-4" /></Btn>
      <div className="mx-1 h-5 w-px bg-border" />
      <Btn title="Conseil" onClick={() => editor.chain().focus().setCallout("conseil").run()}><Lightbulb className="h-4 w-4" /></Btn>
      <Btn title="À éviter" onClick={() => editor.chain().focus().setCallout("aeviter").run()}><AlertTriangle className="h-4 w-4" /></Btn>
      <Btn title="Bon à savoir" onClick={() => editor.chain().focus().setCallout("bonasavoir").run()}><Info className="h-4 w-4" /></Btn>
      <Btn title="FAQ" onClick={() => editor.chain().focus().insertFaqItem().run()}><HelpCircle className="h-4 w-4" /></Btn>
    </div>
  );
}