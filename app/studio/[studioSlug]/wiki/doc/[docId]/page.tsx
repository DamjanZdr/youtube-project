"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  Trash2, 
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
} from "lucide-react";
import Link from "next/link";
import { RichTextEditor } from "@/components/shared/rich-text-editor";

interface DocPageProps {
  params: Promise<{ studioSlug: string; docId: string }>;
}

export default function WikiDocPage({ params }: DocPageProps) {
  const { studioSlug, docId } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [fontSize, setFontSize] = useState("16px");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [editor, setEditor] = useState<any>(null);

  useEffect(() => {
    loadDocument();
  }, [docId]);

  // Auto-save title with shorter debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (title && !loading) {
        saveDocument();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [title]);

  // Auto-save content with longer debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content && !loading) {
        saveDocument();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [content]);

  // Auto-save font preferences immediately
  useEffect(() => {
    if (!loading) {
      saveDocument();
    }
  }, [fontFamily, fontSize]);

  const loadDocument = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("wiki_documents")
      .select("*")
      .eq("id", docId)
      .single();

    if (data) {
      setTitle(data.title);
      setContent(data.content || "");
      setFontFamily(data.font_family || "Inter");
      setFontSize(data.font_size || "16px");
      if (data.created_at) {
        setCreatedAt(new Date(data.created_at));
      }
    }
    setLoading(false);
  };

  const saveDocument = async () => {
    setSaving(true);
    await supabase
      .from("wiki_documents")
      .update({ 
        title, 
        content,
        font_family: fontFamily,
        font_size: fontSize
      })
      .eq("id", docId);
    
    setLastSaved(new Date());
    setSaving(false);
  };

  const deleteDocument = async () => {
    setDeleting(true);
    await supabase
      .from("wiki_documents")
      .delete()
      .eq("id", docId);

    router.push(`/studio/${studioSlug}/wiki`);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Consolidated */}
      <div className="w-72 border-r border-border p-6 flex flex-col gap-4 overflow-y-auto">
        <Link
          href={`/studio/${studioSlug}/wiki`}
          className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Wiki
        </Link>
        
        <div className="h-px bg-border" />
        
        <div>
          <div className="text-xs text-muted-foreground mb-1">Document Name</div>
          <div className="text-sm font-medium truncate">{title || "Untitled"}</div>
        </div>
        
        {createdAt && (
          <>
            <div className="h-px bg-border" />
            <div>
              <div className="text-xs text-muted-foreground mb-1">Created</div>
              <div className="text-sm">
                {createdAt.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
                {" "}
                {createdAt.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </div>
            </div>
          </>
        )}
        
        {lastSaved && (
          <>
            <div className="h-px bg-border" />
            <div>
              <div className="text-xs text-muted-foreground mb-1">Last Saved</div>
              <div className="text-sm">
                {saving ? "Saving..." : (
                  <>
                    {lastSaved.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                    {" "}
                    {lastSaved.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </>
                )}
              </div>
            </div>
          </>
        )}
        
        <div className="h-px bg-border" />

        {/* Font Controls */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Font Family</label>
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Georgia">Georgia</SelectItem>
                <SelectItem value="Times New Roman">Times</SelectItem>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Courier New">Courier</SelectItem>
                <SelectItem value="monospace">Mono</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Font Size</label>
            <Select value={fontSize} onValueChange={setFontSize}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="14px">14px</SelectItem>
                <SelectItem value="16px">16px</SelectItem>
                <SelectItem value="18px">18px</SelectItem>
                <SelectItem value="20px">20px</SelectItem>
                <SelectItem value="22px">22px</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Formatting Controls */}
        {editor && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Headings</label>
              <div className="flex gap-2">
                <Button
                  variant={editor.isActive("heading", { level: 1 }) ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className="flex-1"
                >
                  <Heading1 className="w-4 h-4" />
                </Button>
                <Button
                  variant={editor.isActive("heading", { level: 2 }) ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className="flex-1"
                >
                  <Heading2 className="w-4 h-4" />
                </Button>
                <Button
                  variant={editor.isActive("heading", { level: 3 }) ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  className="flex-1"
                >
                  <Heading3 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Text Style</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={editor.isActive("bold") ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                >
                  <Bold className="w-4 h-4 mr-1" />
                  Bold
                </Button>
                <Button
                  variant={editor.isActive("italic") ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                  <Italic className="w-4 h-4 mr-1" />
                  Italic
                </Button>
                <Button
                  variant={editor.isActive("underline") ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                >
                  <Underline className="w-4 h-4 mr-1" />
                  Under
                </Button>
                <Button
                  variant={editor.isActive("strike") ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                >
                  <Strikethrough className="w-4 h-4 mr-1" />
                  Strike
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Lists</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={editor.isActive("bulletList") ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                  <List className="w-4 h-4 mr-1" />
                  Bullet
                </Button>
                <Button
                  variant={editor.isActive("orderedList") ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                >
                  <ListOrdered className="w-4 h-4 mr-1" />
                  Number
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Text Color</label>
              <input
                type="color"
                onInput={(e) => editor.chain().focus().setColor(e.currentTarget.value).run()}
                value={editor.getAttributes("textStyle").color || "#ffffff"}
                className="w-full h-9 rounded cursor-pointer border border-border"
                title="Text Color"
              />
            </div>
          </div>
        )}
        
        <div className="h-px bg-border mt-auto" />
        
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={() => setShowDeleteDialog(true)}
          className="w-full"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Document
        </Button>
      </div>

      {/* Document Container */}
      <div className="flex-1 flex justify-center overflow-y-auto">
        <div className="w-full max-w-[900px] h-full">
          {/* Document with Title Inside */}
          <div className="h-full">
            <div className="p-16 pt-12">
              {/* Title */}
              <div className="mb-2 pb-3 border-b border-border">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Untitled Document"
                  className="text-4xl font-semibold border-0 bg-transparent p-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/40 mb-2"
                />
                {createdAt && (
                  <div className="text-sm text-muted-foreground">
                    {createdAt.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                    {"  "}
                    {createdAt.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: false 
                    })}
                  </div>
                )}
              </div>

              {/* Editor */}
              <RichTextEditor
                content={content}
                onChange={setContent}
                onEditorReady={setEditor}
                placeholder="Start writing..."
                fontFamily={fontFamily}
                fontSize={fontSize}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground py-4">
            Are you sure you want to delete this document? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteDocument} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
