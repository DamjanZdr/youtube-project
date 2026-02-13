"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/help/rich-text-editor";
import { UserProfileDropdown } from "@/components/shared/user-profile-dropdown";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Send,
  Loader2,
  LayoutGrid,
  Shield,
  HelpCircle,
  BookOpen,
  MessagesSquare,
  TicketIcon,
  Check,
  X,
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());

  // Scroll indicators state
  const tabsNavRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollIndicators = useCallback(() => {
    const nav = tabsNavRef.current;
    if (nav) {
      setCanScrollLeft(nav.scrollLeft > 0);
      setCanScrollRight(nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1);
    }
  }, []);

  useEffect(() => {
    const nav = tabsNavRef.current;
    if (nav) {
      updateScrollIndicators();
      nav.addEventListener('scroll', updateScrollIndicators);
      window.addEventListener('resize', updateScrollIndicators);
      return () => {
        nav.removeEventListener('scroll', updateScrollIndicators);
        window.removeEventListener('resize', updateScrollIndicators);
      };
    }
  }, [updateScrollIndicators, loading]);

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
    }

    setLoading(false);
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!user || selectedCategoryIds.size === 0 || !title.trim() || !content.trim()) {
      toast.error(selectedCategoryIds.size === 0 ? "Please select at least one category" : "Please fill in all fields");
      return;
    }

    setSubmitting(true);

    // Use first selected category as primary (for URL routing)
    const categoryIdsArray = Array.from(selectedCategoryIds);
    const primaryCategoryId = categoryIdsArray[0];
    const primaryCategory = categories.find((c) => c.id === primaryCategoryId);
    if (!primaryCategory) {
      toast.error("Invalid category selection");
      setSubmitting(false);
      return;
    }

    const slug = generateSlug(title);

    // Check if slug already exists in primary category
    const { data: existing } = await supabase
      .from("help_threads")
      .select("id")
      .eq("category_id", primaryCategoryId)
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
        category_id: primaryCategoryId,
        author_id: user.id,
        title: title.trim(),
        slug,
        content: content.trim(),
        is_official: false,
      })
      .select("id, slug")
      .single();

    if (error) {
      console.error(error);
      toast.error("Failed to create thread");
      setSubmitting(false);
      return;
    }

    // Insert all selected categories into junction table
    const junctionRows = categoryIdsArray.map((catId) => ({
      thread_id: thread.id,
      category_id: catId,
    }));

    await supabase.from("help_thread_categories").insert(junctionRows);

    toast.success("Thread created!");
    router.push(`/help/${primaryCategory.slug}/${thread.slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16 md:pb-0">
      {/* Top Navigation - Bottom on mobile, top on desktop */}
      <header className="fixed bottom-0 md:sticky md:top-0 md:bottom-auto left-0 right-0 z-50 glass-strong border-t md:border-t-0 md:border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center h-14 md:h-16 px-1 md:px-2">
            <img
              src="/bplogo.png"
              alt="Logo"
              className="max-h-9 md:max-h-12 object-contain"
              style={{ width: 'auto', height: '100%' }}
            />
          </Link>
          
          <div className="flex items-center gap-3 md:gap-3">
            {user ? (
              <>
                <Link href="/hub">
                  <Button variant="ghost" size="sm" className="gap-1 md:gap-2 px-3 md:px-3 h-10 md:h-9">
                    <LayoutGrid className="w-5 h-5 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Hub</span>
                  </Button>
                </Link>
                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="ghost" size="sm" className="text-orange-400 hover:text-orange-300 hover:bg-orange-400/10 px-3 md:px-3 h-10 md:h-9">
                      <Shield className="w-5 h-5 md:w-4 md:h-4 md:mr-2" />
                      <span className="hidden md:inline">Admin</span>
                    </Button>
                  </Link>
                )}
                <UserProfileDropdown 
                  user={user} 
                  initialAcceptInvites={acceptInvites} 
                />
              </>
            ) : null}
          </div>
        </div>
      </header>

      {/* Sub-navigation */}
      <div className="border-b border-white/10 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 relative">
          {/* Left scroll indicator */}
          {canScrollLeft && (
            <button
              onClick={() => {
                const nav = tabsNavRef.current;
                if (nav) nav.scrollBy({ left: -150, behavior: 'smooth' });
              }}
              className="absolute left-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-r from-background via-background/80 to-transparent flex items-center justify-start md:hidden"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          
          <div 
            ref={tabsNavRef}
            className="flex items-center gap-1 h-12 overflow-x-auto scrollbar-hide"
          >
            <Link
              href="/help"
              className="flex items-center gap-2 px-4 h-full text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors shrink-0 whitespace-nowrap"
            >
              <HelpCircle className="w-4 h-4" />
              Help Center
            </Link>
            <Link
              href="/help/self-help"
              className="flex items-center gap-2 px-4 h-full text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors shrink-0 whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4" />
              Self Help
            </Link>
            <Link
              href="/help/forum"
              className="flex items-center gap-2 px-4 h-full text-sm font-medium border-b-2 border-primary text-foreground shrink-0 whitespace-nowrap"
            >
              <MessagesSquare className="w-4 h-4" />
              Public Forum
            </Link>
            {user && (
              <Link
                href="/help/tickets"
                className="flex items-center gap-2 px-4 h-full text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors shrink-0 whitespace-nowrap"
              >
                <TicketIcon className="w-4 h-4" />
                Contact Support
              </Link>
            )}
          </div>
          
          {/* Right scroll indicator */}
          {canScrollRight && (
            <button
              onClick={() => {
                const nav = tabsNavRef.current;
                if (nav) nav.scrollBy({ left: 150, behavior: 'smooth' });
              }}
              className="absolute right-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-background via-background/80 to-transparent flex items-center justify-end md:hidden"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
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
          {/* Category selector - multi-select */}
          <div>
            <label className="block text-sm font-medium mb-2">Categories</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
              >
                <span className={selectedCategoryIds.size === 0 ? "text-muted-foreground" : ""}>
                  {selectedCategoryIds.size === 0
                    ? "Select categories"
                    : `${selectedCategoryIds.size} ${selectedCategoryIds.size === 1 ? "category" : "categories"} selected`}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg bg-background border border-white/10 shadow-xl overflow-hidden">
                    <div className="py-1 max-h-64 overflow-y-auto">
                      {categories.map((cat) => {
                        const isSelected = selectedCategoryIds.has(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => toggleCategory(cat.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                              isSelected
                                ? "bg-primary/15 text-primary"
                                : "text-foreground hover:bg-white/5"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-white/20"
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                            <span className="flex-1">{cat.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
            {selectedCategoryIds.size > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {categories
                  .filter((c) => selectedCategoryIds.has(c.id))
                  .map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors"
                    >
                      {cat.name}
                      <X className="w-3 h-3" />
                    </button>
                  ))}
              </div>
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
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Provide details, context, or share your thoughts..."
              rows={10}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Tip: Embed YouTube videos using [youtube:VIDEO_ID]
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-4">
            <Link href="/help/forum" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
            </Link>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !title.trim() || !content.trim() || selectedCategoryIds.size === 0}
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
