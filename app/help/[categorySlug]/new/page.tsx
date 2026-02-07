"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ChevronLeft, Send, Loader2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

export default function NewThreadPage() {
  const params = useParams();
  const router = useRouter();
  const categorySlug = params.categorySlug as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const supabase = createClient();

  useEffect(() => {
    checkAuthAndLoad();
  }, [categorySlug]);

  const checkAuthAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/sign-in");
      return;
    }

    setUser(user);

    // Load category
    const { data: cat } = await supabase
      .from("help_categories")
      .select("id, name, slug, description")
      .eq("slug", categorySlug)
      .single();

    if (!cat) {
      router.push("/help");
      return;
    }

    setCategory(cat);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !category || !title.trim() || !content.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);

    const slug = generateSlug(title);

    // Check if slug already exists in this category
    const { data: existing } = await supabase
      .from("help_threads")
      .select("id")
      .eq("category_id", category.id)
      .eq("slug", slug)
      .single();

    if (existing) {
      toast.error("A thread with a similar title already exists");
      setSubmitting(false);
      return;
    }

    const { data: thread, error } = await supabase
      .from("help_threads")
      .insert({
        category_id: category.id,
        author_id: user.id,
        title: title.trim(),
        slug,
        content: content.trim(),
      })
      .select("slug")
      .single();

    if (error) {
      console.error(error);
      toast.error("Failed to create thread");
      setSubmitting(false);
      return;
    }

    toast.success("Thread created!");
    router.push(`/help/${categorySlug}/${thread.slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-xl font-semibold mb-4">Category not found</p>
        <Link href="/help">
          <Button variant="outline">Back to Help Center</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <Link
            href={`/help/${categorySlug}`}
            className="inline-flex items-center gap-2 text-xs md:text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to {category.name}
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold">New Thread</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2">
            Start a new discussion in {category.name}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="space-y-5 md:space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your question or topic?"
              maxLength={255}
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium mb-2">Content</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Provide details, context, or share your thoughts..."
              rows={10}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Tip: You can embed YouTube videos using [youtube:VIDEO_ID]
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-4">
            <Link href={`/help/${categorySlug}`} className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
            </Link>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !title.trim() || !content.trim()}
              className="gap-2 w-full sm:w-auto"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Create Thread
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
