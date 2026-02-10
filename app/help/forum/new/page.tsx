"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserProfileDropdown } from "@/components/shared/user-profile-dropdown";
import { toast } from "sonner";
import {
  ChevronLeft,
  Send,
  Loader2,
  LayoutGrid,
  Shield,
  BookOpen,
  MessagesSquare,
  TicketIcon,
} from "lucide-react";

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

export default function NewForumThreadPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; full_name?: string | null; avatar_url?: string | null } | null>(null);
  const [acceptInvites, setAcceptInvites] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const supabase = createClient();

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      router.push("/auth/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, accept_invites, role")
      .eq("id", authUser.id)
      .single();

    setUser({
      id: authUser.id,
      email: authUser.email || "",
      full_name: profile?.full_name,
      avatar_url: profile?.avatar_url,
    });
    setAcceptInvites(profile?.accept_invites ?? true);
    setIsAdmin(profile?.role === "admin");

    // Load categories
    const { data: cats } = await supabase
      .from("help_categories")
      .select("id, name, slug, description")
      .order("position");

    if (cats && cats.length > 0) {
      setCategories(cats);
      setSelectedCategoryId(cats[0].id);
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !selectedCategoryId || !title.trim() || !content.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);

    const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
    if (!selectedCategory) {
      toast.error("Please select a category");
      setSubmitting(false);
      return;
    }

    const slug = generateSlug(title);

    // Check if slug already exists in this category
    const { data: existing } = await supabase
      .from("help_threads")
      .select("id")
      .eq("category_id", selectedCategoryId)
      .eq("slug", slug)
      .single();

    if (existing) {
      toast.error("A thread with a similar title already exists in this category");
      setSubmitting(false);
      return;
    }

    const { data: thread, error } = await supabase
      .from("help_threads")
      .insert({
        category_id: selectedCategoryId,
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
    router.push(`/help/${selectedCategory.slug}/${thread.slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 glass-strong border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center h-14 md:h-16 px-1 md:px-2">
            <img
              src="/bplogo.png"
              alt="Logo"
              className="max-h-9 md:max-h-12 object-contain"
              style={{ width: 'auto', height: '100%' }}
            />
          </Link>
          
          <div className="flex items-center gap-2 md:gap-3">
            {user ? (
              <>
                <Link href="/hub">
                  <Button variant="ghost" size="sm" className="gap-1 md:gap-2 px-2 md:px-3">
                    <LayoutGrid className="w-4 h-4" />
                    <span className="hidden sm:inline">Hub</span>
                  </Button>
                </Link>
                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="ghost" size="sm" className="text-orange-400 hover:text-orange-300 hover:bg-orange-400/10 px-2 md:px-3">
                      <Shield className="w-4 h-4 md:mr-2" />
                      <span className="hidden md:inline">Admin</span>
                    </Button>
                  </Link>
                )}
                <UserProfileDropdown 
                  user={user} 
                  initialAcceptInvites={acceptInvites} 
                />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link href="/auth/sign-up">
                  <Button size="sm">Register</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sub-navigation */}
      <div className="border-b border-white/10 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center gap-1 h-12">
            <Link
              href="/help"
              className="flex items-center gap-2 px-4 h-full text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Self Help
            </Link>
            <Link
              href="/help/forum"
              className="flex items-center gap-2 px-4 h-full text-sm font-medium border-b-2 border-primary text-foreground"
            >
              <MessagesSquare className="w-4 h-4" />
              Forum
            </Link>
            {user && (
              <Link
                href="/help/tickets"
                className="flex items-center gap-2 px-4 h-full text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors"
              >
                <TicketIcon className="w-4 h-4" />
                Tickets
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
        <Link
          href="/help/forum"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Forum
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold mb-2">New Thread</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Start a new discussion in the community forum
        </p>

        <div className="space-y-5 md:space-y-6">
          {/* Category selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {selectedCategoryId && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {categories.find((c) => c.id === selectedCategoryId)?.description}
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your question or topic?"
              maxLength={255}
              className="bg-white/5 border-white/10"
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
              className="resize-none bg-white/5 border-white/10"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Tip: You can use Markdown formatting and embed YouTube videos using [youtube:VIDEO_ID]
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-4">
            <Link href="/help/forum" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
            </Link>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !title.trim() || !content.trim() || !selectedCategoryId}
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
