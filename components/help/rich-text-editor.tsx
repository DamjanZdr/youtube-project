"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Quote,
  Code,
  Minus,
  Undo,
  Redo,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCallback, useEffect } from "react";
import TurndownService from "turndown";
import { marked } from "marked";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

// Configure marked for synchronous operation
marked.use({ async: false });

// Convert HTML to Markdown for storage
const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",  // Use asterisks for italic, not underscores
});

// Custom rule for underline (markdown doesn't support it natively, keep as HTML)
turndownService.addRule("underline", {
  filter: ["u"],
  replacement: function (content) {
    return "<u>" + content + "</u>";
  },
});

// Convert Markdown to HTML for loading into editor
function markdownToHtml(markdown: string): string {
  if (!markdown) return "";
  
  // Use marked for proper markdown parsing
  const html = marked.parse(markdown, { async: false }) as string;
  return html;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write content...",
  rows = 12,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: markdownToHtml(value),
    editorProps: {
      attributes: {
        class: `prose prose-invert prose-sm max-w-none focus:outline-none min-h-[${rows * 1.5}rem] px-3 py-2`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const markdown = turndownService.turndown(html);
      onChange(markdown);
    },
  });

  // Update editor content when value changes externally
  useEffect(() => {
    if (!editor) return;
    
    const currentContent = turndownService.turndown(editor.getHTML());
    // Only update if content actually changed externally
    if (value !== currentContent) {
      editor.commands.setContent(markdownToHtml(value));
      // Move cursor to end after setting content
      editor.commands.focus("end");
    }
  }, [value, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    
    // Check if there's selected text
    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    
    if (!hasSelection) {
      // No text selected - prompt for both text and URL
      const text = window.prompt("Link text");
      if (!text) return;
      
      const url = window.prompt("URL");
      if (!url) return;
      
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${url}">${text}</a>`)
        .run();
      return;
    }
    
    // Text is selected - just ask for URL
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl || "https://");

    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 min-h-[200px] animate-pulse" />
    );
  }

  const tools = [
    {
      icon: Heading2,
      label: "Heading 2",
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive("heading", { level: 2 }),
    },
    {
      icon: Heading3,
      label: "Heading 3",
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive("heading", { level: 3 }),
    },
    {
      icon: Bold,
      label: "Bold",
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive("bold"),
    },
    {
      icon: Italic,
      label: "Italic",
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive("italic"),
    },
    {
      icon: UnderlineIcon,
      label: "Underline",
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: editor.isActive("underline"),
    },
    {
      icon: LinkIcon,
      label: "Link",
      action: setLink,
      isActive: editor.isActive("link"),
    },
    {
      icon: List,
      label: "Bullet List",
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive("bulletList"),
    },
    {
      icon: ListOrdered,
      label: "Numbered List",
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive("orderedList"),
    },
    {
      icon: Quote,
      label: "Quote",
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive("blockquote"),
    },
    {
      icon: Code,
      label: "Code",
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: editor.isActive("codeBlock"),
    },
    {
      icon: Minus,
      label: "Divider",
      action: () => editor.chain().focus().setHorizontalRule().run(),
      isActive: false,
    },
  ];

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-white/10 bg-white/5">
        <TooltipProvider delayDuration={300}>
          {tools.map((tool, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={tool.action}
                  className={`h-8 w-8 p-0 ${
                    tool.isActive
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tool.icon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{tool.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          
          <div className="w-px h-6 bg-white/10 mx-1" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <Undo className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Undo</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <Redo className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Redo</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Editor */}
      <EditorContent 
        editor={editor} 
        className="[&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:px-4 [&_.ProseMirror]:py-3 [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:text-[15px] [&_.ProseMirror]:leading-relaxed [&_.ProseMirror]:text-foreground/80 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:text-foreground [&_.ProseMirror_h2]:mt-0 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:text-foreground [&_.ProseMirror_h3]:mt-0 [&_.ProseMirror_h3]:mb-1 [&_.ProseMirror_p]:my-0 [&_.ProseMirror_p]:mb-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ul]:my-0 [&_.ProseMirror_ul]:mb-2 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_ol]:my-0 [&_.ProseMirror_ol]:mb-2 [&_.ProseMirror_li]:my-0 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-white/20 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-muted-foreground [&_.ProseMirror_blockquote]:my-0 [&_.ProseMirror_blockquote]:mb-2 [&_.ProseMirror_pre]:bg-black/30 [&_.ProseMirror_pre]:rounded [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:font-mono [&_.ProseMirror_pre]:text-sm [&_.ProseMirror_pre]:my-0 [&_.ProseMirror_pre]:mb-2 [&_.ProseMirror_code]:bg-black/30 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:font-mono [&_.ProseMirror_code]:text-sm [&_.ProseMirror_hr]:border-white/20 [&_.ProseMirror_hr]:my-4 [&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline [&_.ProseMirror_strong]:font-semibold [&_.ProseMirror_strong]:text-foreground"
      />
    </div>
  );
}
