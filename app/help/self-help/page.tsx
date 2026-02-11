"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  ChevronRight,
  FileText,
  Pin,
  LayoutGrid,
  Shield,
  HelpCircle,
  BookOpen,
  MessagesSquare,
  TicketIcon,
  Search,
  X,
  Eye,
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
  description: string;
  icon: string;
  thread_count?: number;
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
    name?: string;
  };
}

function SelfHelpContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");

  const [categories, setCategories] = useState<Category[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string; full_name?: string | null; avatar_url?: string | null } | null>(null);
  const [acceptInvites, setAcceptInvites] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();
    checkUser();
  }, [categoryParam]);

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
    }
  };

  const loadData = async () => {
    // Load categories
    const { data: cats } = await supabase
      .from("help_categories")
      .select("*")
      .order("position");

    if (cats) {
      // Get thread counts per category
      const catsWithCounts = await Promise.all(
        cats.map(async (cat) => {
          const { count } = await supabase
            .from("help_threads")
            .select("*", { count: "exact", head: true })
            .eq("category_id", cat.id);
          return { ...cat, thread_count: count || 0 };
        })
      );
      setCategories(catsWithCounts);

      // Select category from URL param or default to first
      if (categoryParam) {
        const matchedCat = catsWithCounts.find((c) => c.slug === categoryParam);
        if (matchedCat) {
          setActiveCategory(matchedCat.id);
        } else if (catsWithCounts.length > 0) {
          setActiveCategory(catsWithCounts[0].id);
        }
      } else if (catsWithCounts.length > 0) {
        setActiveCategory(catsWithCounts[0].id);
      }
    }

    // Load all threads
    const { data: allThreads } = await supabase
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
        category:help_categories(slug, name)
      `)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (allThreads) {
      setThreads(allThreads as unknown as Thread[]);
    }

    setLoading(false);
  };

  const activeThreads = activeCategory
    ? threads.filter((t) => {
        if (t.category_id !== activeCategory) return false;
        if (searchQuery.trim()) {
          return t.title.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return true;
      })
    : searchQuery.trim()
      ? threads.filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
      : threads;

  const activeCategoryData = categories.find((c) => c.id === activeCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 glass-strong border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center h-14 md:h-16 px-1 md:px-2">
            <img
              src="/bplogo.png"
              alt="Logo"
              className="max-h-9 md:max-h-12 object-contain"
              style={{ width: "auto", height: "100%" }}
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
              <HelpCircle className="w-4 h-4" />
              Help Center
            </Link>
            <Link
              href="/help/self-help"
              className="flex items-center gap-2 px-4 h-full text-sm font-medium border-b-2 border-primary text-foreground"
            >
              <BookOpen className="w-4 h-4" />
              Self Help
            </Link>
            <Link
              href="/help/forum"
              className="flex items-center gap-2 px-4 h-full text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors"
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

      {/* Main content: sidebar + articles */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Category Sidebar */}
          <aside className="w-full md:w-72 lg:w-80 shrink-0">
            <div className="md:sticky md:top-24">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-3">
                Categories
              </h3>
              <nav className="space-y-1">
                {categories.map((category) => {
                  const Icon = iconMap[category.icon] || FileText;
                  const isActive = activeCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                        isActive
                          ? "bg-primary/15 text-primary border border-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <div
                        className={`p-1.5 rounded-md transition-colors ${
                          isActive
                            ? "bg-primary/20 text-primary"
                            : "bg-white/5 text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">
                          {category.name}
                        </span>
                      </div>
                      <span
                        className={`text-xs tabular-nums ${
                          isActive ? "text-primary/70" : "text-muted-foreground/50"
                        }`}
                      >
                        {category.thread_count}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Articles List */}
          <main className="flex-1 min-w-0">
            {/* Category Header */}
            {activeCategoryData && (
              <div className="mb-4">
                <h1 className="text-xl md:text-2xl font-bold mb-1">
                  {activeCategoryData.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {activeCategoryData.description}
                </p>
              </div>
            )}

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
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

            {/* Articles */}
            {activeThreads.length > 0 ? (
              <div className="space-y-2">
                {activeThreads.map((thread) => (
                  <Link
                    key={thread.id}
                    href={`/help/${thread.category.slug}/${thread.slug}`}
                    className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all"
                  >
                    <div className="p-2 rounded-lg bg-white/5 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {thread.is_pinned && (
                          <Pin className="w-3 h-3 text-yellow-500 shrink-0" />
                        )}
                        {thread.is_official && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary/20 text-primary shrink-0">
                            Official
                          </span>
                        )}
                        <span className="font-medium truncate group-hover:text-primary transition-colors">
                          {thread.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {thread.view_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {thread.reply_count}
                        </span>
                        <span>
                          {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No articles yet</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Articles will appear here once they&apos;re published.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function SelfHelpPage() {
  return (
    <Suspense>
      <SelfHelpContent />
    </Suspense>
  );
}
