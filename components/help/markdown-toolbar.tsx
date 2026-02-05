"use client";

import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
}

export function MarkdownToolbar({ textareaRef, value, onChange }: MarkdownToolbarProps) {
  const insertText = (before: string, after: string = "", placeholder: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const textToInsert = selectedText || placeholder;
    const newText = value.substring(0, start) + before + textToInsert + after + value.substring(end);
    
    onChange(newText);

    // Set cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + textToInsert.length;
      textarea.setSelectionRange(
        selectedText ? newCursorPos + after.length : start + before.length,
        selectedText ? newCursorPos + after.length : start + before.length + placeholder.length
      );
    }, 0);
  };

  const insertAtLineStart = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const newText = value.substring(0, lineStart) + prefix + value.substring(lineStart);
    
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  const tools = [
    {
      icon: Heading2,
      label: "Heading 2",
      action: () => insertAtLineStart("## "),
      shortcut: "## text",
    },
    {
      icon: Heading3,
      label: "Heading 3",
      action: () => insertAtLineStart("##### "),
      shortcut: "##### text",
    },
    {
      icon: Bold,
      label: "Bold",
      action: () => insertText("**", "**", "bold text"),
      shortcut: "**text**",
    },
    {
      icon: Italic,
      label: "Italic",
      action: () => insertText("*", "*", "italic text"),
      shortcut: "*text*",
    },
    {
      icon: Link,
      label: "Link",
      action: () => insertText("[", "](url)", "link text"),
      shortcut: "[text](url)",
    },
    {
      icon: List,
      label: "Bullet List",
      action: () => insertAtLineStart("- "),
      shortcut: "- item",
    },
    {
      icon: ListOrdered,
      label: "Numbered List",
      action: () => insertAtLineStart("1. "),
      shortcut: "1. item",
    },
    {
      icon: Quote,
      label: "Quote",
      action: () => insertAtLineStart("> "),
      shortcut: "> quote",
    },
    {
      icon: Code,
      label: "Code",
      action: () => insertText("`", "`", "code"),
      shortcut: "`code`",
    },
    {
      icon: Minus,
      label: "Horizontal Rule",
      action: () => insertText("\n---\n", "", ""),
      shortcut: "---",
    },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 p-2 rounded-t-lg bg-white/5 border border-white/10 border-b-0">
        {tools.map((tool, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={tool.action}
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
    </TooltipProvider>
  );
}
