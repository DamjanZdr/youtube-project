"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserProfileDropdown } from "@/components/shared/user-profile-dropdown";
import {
  Rocket,
  Folder,
  Image,
  Tv,
  Users,
  CreditCard,
  Youtube,
  Lightbulb,
  MessageCircle,
  Search,
  HelpCircle,
  TicketIcon,
  ChevronRight,
  ChevronLeft,
  FileText,
  Pin,
  LayoutGrid,
  Shield,
  Loader2,
  X,
  BookOpen,
  MessagesSquare,
  Plus,
  Eye,
  Filter,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  rocket: Rocket,
  folder: Folder,
  image: Image,
  tv: Tv,
  users: Users,
  "credit-card": CreditCard,
  youtube: Youtube,
  lightbulb: Lightbulb,
  "message-circle": MessageCircle,
};

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

interface Thread {
  id: string;
  title: string;
  slug: string;
  is_pinned: boolean;
  is_official: boolean;
  is_locked: boolean;
  view_count: number;
  reply_count: number;
  created_at: string;
  category_id: string;
  category: {
    slug: string;
    name: string;
    icon: string;
  };
  author: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  thread_categories: { category_id: string }[];
}

export default function ForumPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string; full_name?: string | null; avatar_url?: string | null } | null>(null);
  const [acceptInvites, setAcceptInvites] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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
    loadData();
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
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
    } else {
      setUser(null);
    }
  };

  const loadData = async () => {
    // Load categories
    const { data: cats } = await supabase
      .from("help_categories")
      .select("id, name, slug, icon")
      .order("position");

    if (cats) {
      setCategories(cats);
    }

    // Load user-generated threads only (not official/system)
    // Use .or to catch both false and null values for is_official
    const { data: threadData, error: threadError } = await supabase
      .from("help_threads")
      .select(`
        id,
        title,
        slug,
        is_pinned,
        is_official,
        is_locked,
        view_count,
        reply_count,
        created_at,
        category_id,
        category:help_categories(slug, name, icon),
        author:profiles!author_id(full_name, avatar_url),
        thread_categories:help_thread_categories(category_id)
      `)
      .or("is_official.eq.false,is_official.is.null")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (threadError) {
      console.error("Error loading forum threads:", threadError);
    }
    
    if (threadData) {
      setThreads(threadData as unknown as Thread[]);
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

  // Filter threads
  const filteredThreads = threads.filter((thread) => {
    if (selectedCategoryIds.size > 0) {
      // Check if thread has ANY of the selected categories (via junction table)
      const threadCatIds = thread.thread_categories?.map((tc) => tc.category_id) || [thread.category_id];
      const hasMatch = threadCatIds.some((id) => selectedCategoryIds.has(id));
      if (!hasMatch) return false;
    }
    if (searchQuery.trim()) {
      return thread.title.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

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
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm" className="h-10 md:h-9">Login</Button>
                </Link>
                <Link href="/auth/sign-up">
                  <Button size="sm" className="h-10 md:h-9">Register</Button>
                </Link>
              </div>
            )}
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

      {/* Forum Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Public Forum</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ask questions, share ideas, and discuss with the community
            </p>
          </div>
          {user && (
            <Link href="/help/forum/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Thread
              </Button>
            </Link>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Threads List */}
          <div className="flex-1 min-w-0">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search threads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-white/5 border-white/10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Active filters */}
            {selectedCategoryIds.size > 0 && (
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-xs text-muted-foreground">Filtered by:</span>
                {categories
                  .filter((c) => selectedCategoryIds.has(c.id))
                  .map((cat) => {
                    const Icon = iconMap[cat.icon] || FileText;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors"
                      >
                        <Icon className="w-3 h-3" />
                        {cat.name}
                        <X className="w-3 h-3" />
                      </button>
                    );
                  })}
                <button
                  onClick={() => setSelectedCategoryIds(new Set())}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}

            {filteredThreads.length === 0 ? (
              <div className="text-center py-16 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <MessagesSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-2 text-muted-foreground">
                  {searchQuery || selectedCategoryIds.size > 0 ? "No threads match your filter" : "No community threads yet"}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery || selectedCategoryIds.size > 0
                    ? "Try adjusting your search or topics."
                    : "Be the first to start a discussion!"}
                </p>
                {user && !searchQuery && selectedCategoryIds.size === 0 && (
                  <Link href="/help/forum/new">
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Create Thread
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredThreads.map((thread) => {
                  return (
                    <Link
                      key={thread.id}
                      href={`/help/${thread.category.slug}/${thread.slug}`}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 hover:bg-white/[0.06] transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {thread.is_pinned && (
                            <Pin className="w-3 h-3 text-yellow-500 shrink-0" />
                          )}
                          {thread.is_locked && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-red-500/20 text-red-400 shrink-0">
                              Locked
                            </span>
                          )}
                          <span className="font-medium truncate group-hover:text-primary transition-colors">{thread.title}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          {/* Show all categories as tags */}
                          {(() => {
                            const threadCatIds = thread.thread_categories?.map((tc) => tc.category_id) || [];
                            const threadCats = threadCatIds.length > 0
                              ? categories.filter((c) => threadCatIds.includes(c.id))
                              : categories.filter((c) => c.id === thread.category_id);
                            return threadCats.map((cat) => {
                              const Icon = iconMap[cat.icon] || FileText;
                              return (
                                <span key={cat.id} className="flex items-center gap-1">
                                  <Icon className="w-3 h-3" />
                                  {cat.name}
                                </span>
                              );
                            });
                          })()}
                          <span>
                            by {thread.author?.full_name || "Unknown"}
                          </span>
                          <span>
                            {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 sm:gap-5 text-xs text-muted-foreground shrink-0">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          <span>{thread.view_count}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{thread.reply_count}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Topics Sidebar */}
          <aside className="w-full md:w-64 lg:w-72 shrink-0 order-first md:order-last">
            <div className="md:sticky md:top-24 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Topics
              </h3>
              <nav className="space-y-1">
                {categories.map((cat) => {
                  const Icon = iconMap[cat.icon] || FileText;
                  const isSelected = selectedCategoryIds.has(cat.id);
                  const count = threads.filter((t) => {
                    const threadCatIds = t.thread_categories?.map((tc) => tc.category_id) || [t.category_id];
                    return threadCatIds.includes(cat.id);
                  }).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                        isSelected
                          ? "bg-primary/15 text-primary border border-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <div
                        className={`p-1.5 rounded-md transition-colors ${
                          isSelected
                            ? "bg-primary/20 text-primary"
                            : "bg-white/5 text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-medium flex-1 truncate">
                        {cat.name}
                      </span>
                      <span
                        className={`text-xs tabular-nums ${
                          isSelected ? "text-primary/70" : "text-muted-foreground/50"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </nav>
              {selectedCategoryIds.size > 0 && (
                <button
                  onClick={() => setSelectedCategoryIds(new Set())}
                  className="w-full mt-3 pt-3 border-t border-white/[0.06] text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
                >
                  Clear selection
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
