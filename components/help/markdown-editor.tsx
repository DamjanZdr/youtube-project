"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link,
  Quote,
  Code,
  Minus,
  Eye,
  Edit3,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function MarkdownEditor({ 
  value, 
  onChange, 
  placeholder = "Write content... (supports Markdown)",
  rows = 12
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);

  const insertText = (before: string, after: string = "", placeholder: string = "") => {
    if (!textareaRef) return;

    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const textToInsert = selectedText || placeholder;
    const newText = value.substring(0, start) + before + textToInsert + after + value.substring(end);
    
    onChange(newText);

    setTimeout(() => {
      textareaRef.focus();
      const newCursorPos = start + before.length + textToInsert.length;
      textareaRef.setSelectionRange(
        selectedText ? newCursorPos + after.length : start + before.length,
        selectedText ? newCursorPos + after.length : start + before.length + placeholder.length
      );
    }, 0);
  };

  const insertAtLineStart = (prefix: string) => {
    if (!textareaRef) return;

    const start = textareaRef.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const newText = value.substring(0, lineStart) + prefix + value.substring(lineStart);
    
    onChange(newText);

    setTimeout(() => {
      textareaRef.focus();
      textareaRef.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  const tools = [
    {
      icon: Heading2,
      label: "Heading 2",
      action: () => insertAtLineStart("## "),
      shortcut: "##",
    },
    {
      icon: Heading3,
      label: "Heading 3",
      action: () => insertAtLineStart("##### "),
      shortcut: "#####",
    },
    {
      icon: Bold,
      label: "Bold",
      action: () => insertText("**", "**", "bold text"),
      shortcut: "**B**",
    },
    {
      icon: Italic,
      label: "Italic",
      action: () => insertText("*", "*", "italic text"),
      shortcut: "*I*",
    },
    {
      icon: Link,
      label: "Link",
      action: () => insertText("[", "](url)", "link text"),
      shortcut: "[]()",
    },
    {
      icon: List,
      label: "Bullet List",
      action: () => insertAtLineStart("- "),
      shortcut: "- ",
    },
    {
      icon: ListOrdered,
      label: "Numbered List",
      action: () => insertAtLineStart("1. "),
      shortcut: "1.",
    },
    {
      icon: Quote,
      label: "Quote",
      action: () => insertAtLineStart("> "),
      shortcut: ">",
    },
    {
      icon: Code,
      label: "Code",
      action: () => insertText("`", "`", "code"),
      shortcut: "`x`",
    },
    {
      icon: Minus,
      label: "Divider",
      action: () => insertText("\n---\n", "", ""),
      shortcut: "---",
    },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="rounded-lg border border-white/10 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-2 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-1">
            {tools.map((tool, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={tool.action}
                    disabled={mode === "preview"}
                  >
                    <tool.icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p>{tool.label}</p>
                  <p className="text-muted-foreground font-mono">{tool.shortcut}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          
          {/* Write/Preview Toggle */}
          <div className="flex items-center gap-1 bg-white/5 rounded-md p-0.5">
            <Button
              type="button"
              variant={mode === "write" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs gap-1.5"
              onClick={() => setMode("write")}
            >
              <Edit3 className="h-3.5 w-3.5" />
              Write
            </Button>
            <Button
              type="button"
              variant={mode === "preview" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs gap-1.5"
              onClick={() => setMode("preview")}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </Button>
          </div>
        </div>

        {/* Editor or Preview */}
        {mode === "write" ? (
          <Textarea
            ref={(el) => setTextareaRef(el)}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="border-0 rounded-none focus-visible:ring-0 font-mono text-sm resize-none"
          />
        ) : (
          <div 
            className="p-4 min-h-[200px] bg-background"
            style={{ minHeight: `${rows * 1.5}rem` }}
          >
            {value.trim() ? (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-medium prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3 prose-h5:text-sm prose-h5:mt-4 prose-h5:mb-2 prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-strong:text-foreground prose-strong:font-medium prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-blockquote:border-primary/50 prose-blockquote:text-muted-foreground prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {value}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                Nothing to preview yet. Switch to Write mode and add some content.
              </p>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
