"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import Link from "next/link";

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
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    loadDocument();
  }, [docId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (title || content) {
        saveDocument();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, content]);

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
    }
    setLoading(false);
  };

  const saveDocument = async () => {
    setSaving(true);
    await supabase
      .from("wiki_documents")
      .update({ title, content })
      .eq("id", docId);
    
    setLastSaved(new Date());
    setSaving(false);
  };

  const deleteDocument = async () => {
    if (!confirm("Delete this document?")) return;

    await supabase
      .from("wiki_documents")
      .delete()
      .eq("id", docId);

    router.push(\/studio/\/wiki\);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href={\/studio/\/wiki\}
          className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Wiki
        </Link>
        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-sm text-muted-foreground">
              {saving ? "Saving..." : \Saved \\}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={saveDocument} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button variant="destructive" size="sm" onClick={deleteDocument}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="glass-card p-8 space-y-6">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Document title..."
          className="text-3xl font-bold border-0 bg-transparent p-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/50"
        />
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing..."
          className="min-h-[600px] border-0 bg-transparent p-0 resize-none focus-visible:ring-0 text-lg leading-relaxed placeholder:text-muted-foreground/50"
        />
      </div>
    </div>
  );
}
