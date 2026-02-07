"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { Loader2, Check } from "lucide-react";

export default function IdeaPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const supabase = createClient();

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    loadIdea();
  }, [projectId]);

  // Auto-save with debounce
  useEffect(() => {
    if (loading) return;
    
    const timer = setTimeout(() => {
      saveIdea();
    }, 1000);

    return () => clearTimeout(timer);
  }, [content]);

  const loadIdea = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("projects")
      .select("idea_content")
      .eq("id", projectId)
      .single();

    if (data) {
      setContent(data.idea_content || "");
    }
    setLoading(false);
  };

  const saveIdea = async () => {
    setSaving(true);
    await supabase
      .from("projects")
      .update({ idea_content: content })
      .eq("id", projectId);
    
    setLastSaved(new Date());
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 bg-card/30">
        <div>
          <h2 className="text-lg font-semibold">Idea Notes</h2>
          <p className="text-sm text-muted-foreground">
            Brainstorm and capture your video ideas
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : lastSaved ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <span>Saved {lastSaved.toLocaleTimeString()}</span>
            </>
          ) : null}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Start brainstorming your video idea... What's the concept? What points do you want to cover? What's the hook?"
          />
        </div>
      </div>
    </div>
  );
}
