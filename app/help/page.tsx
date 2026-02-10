"use client";

import { useState, useEffect } from "react";
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
  FileText,
  Pin,
  LayoutGrid,
  Shield,
  Loader2,
  X,
  BookOpen,
  MessagesSquare,
} from "lucide-react";

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
  position: number;
}

interface Thread {
  id: string;
  title: string;
  slug: string;
  is_pinned: boolean;
  is_official: boolean;
  reply_count: number;
  created_at: string;
  category_id: string;
  category: {
    slug: string;
    name?: string;
  };
}

export default function HelpCenterPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [articlesByCategory, setArticlesByCategory] = useState<Record<string, Thread[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Thread[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string; full_name?: string | null; avatar_url?: string | null } | null>(null);
  const [acceptInvites, setAcceptInvites] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();
    checkUser();
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearching(true);
      const query = searchQuery.toLowerCase().trim();
      
      const { data: threads } = await supabase
        .from("help_threads")
        .select(`
          id,
          title,
          slug,
          is_pinned,
          is_official,
          reply_count,
          created_at,
          category_id,
          category:help_categories(slug, name)
        `)
        .or(`title.ilike.%${query}%`)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);

      if (threads) {
        setSearchResults(threads as unknown as Thread[]);
      }
      setSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

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
      .select("*")
      .order("position");

    if (cats) {
      setCategories(cats);

      // Load all articles grouped by category
      const { data: articles } = await supabase
        .from("help_threads")
        .select(`
          id,
          title,
          slug,
          is_pinned,
          is_official,
          reply_count,
          created_at,
          category_id,
          category:help_categories(slug, name)
        `)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (articles) {
        const grouped: Record<string, Thread[]> = {};
        for (const article of articles as unknown as Thread[]) {
          if (!grouped[article.category_id]) {
            grouped[article.category_id] = [];
          }
          grouped[article.category_id].push(article);
        }
        setArticlesByCategory(grouped);
      }

      // Auto-expand and select first category
      if (cats.length > 0) {
        setExpandedCategories(new Set([cats[0].id]));
        setSelectedCategory(cats[0].id);
      }
    }

    setLoading(false);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
    setSelectedCategory(categoryId);
  };

  const selectCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (!expandedCategories.has(categoryId)) {
      setExpandedCategories((prev) => new Set(prev).add(categoryId));
    }
  };

  const selectedCategoryData = categories.find((c) => c.id === selectedCategory);
  const selectedArticles = selectedCategory ? (articlesByCategory[selectedCategory] || []) : [];

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

      {/* Sub-navigation: Self Help / Forum / Tickets */}
      <div className="border-b border-white/10 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center gap-1 h-12">
            <Link
              href="/help"
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

            {/* Search - right side */}
            <div className="ml-auto relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-8 text-sm bg-white/5 border-white/10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Search Results Dropdown */}
              {searchQuery.trim() && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-white/10 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                  {searching ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-1">
                      {searchResults.map((thread) => (
                        <Link
                          key={thread.id}
                          href={`/help/${thread.category.slug}/${thread.slug}`}
                          onClick={() => setSearchQuery("")}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-sm"
                        >
                          <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium truncate block">{thread.title}</span>
                            {thread.category.name && (
                              <span className="text-xs text-muted-foreground">in {thread.category.name}</span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No results found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Sidebar + Articles */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-64 lg:w-72 shrink-0 border-r border-white/10 bg-white/[0.01] overflow-y-auto hidden md:block">
          <nav className="py-4">
            {categories.map((category) => {
              const Icon = iconMap[category.icon] || FileText;
              const isExpanded = expandedCategories.has(category.id);
              const isActive = selectedCategory === category.id;
              const articles = articlesByCategory[category.id] || [];

              return (
                <div key={category.id}>
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-left transition-colors ${
                      isActive
                        ? "text-primary bg-primary/5"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    <ChevronRight
                      className={`w-3.5 h-3.5 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    />
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{category.name}</span>
                    {articles.length > 0 && (
                      <span className="ml-auto text-xs text-muted-foreground/60">{articles.length}</span>
                    )}
                  </button>

                  {/* Expanded article list */}
                  {isExpanded && articles.length > 0 && (
                    <div className="ml-4 border-l border-white/5">
                      {articles.map((article) => (
                        <Link
                          key={article.id}
                          href={`/help/${article.category.slug}/${article.slug}`}
                          className="flex items-center gap-2 pl-6 pr-4 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                        >
                          <FileText className="w-3 h-3 shrink-0" />
                          <span className="truncate">{article.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          {/* Mobile category selector */}
          <div className="md:hidden border-b border-white/10 p-4">
            <select
              value={selectedCategory || ""}
              onChange={(e) => selectCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-sm"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="p-6 md:p-8 lg:p-10 max-w-4xl">
            {selectedCategoryData ? (
              <>
                {/* Category header */}
                <div className="mb-8">
                  <h1 className="text-2xl md:text-3xl font-bold mb-2">
                    {selectedCategoryData.name}
                  </h1>
                  <p className="text-muted-foreground">
                    {selectedCategoryData.description}
                  </p>
                </div>

                {/* Articles list */}
                {selectedArticles.length === 0 ? (
                  <div className="text-center py-16">
                    <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold mb-2 text-muted-foreground">No articles yet</h2>
                    <p className="text-sm text-muted-foreground">
                      Articles for this category will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedArticles.map((article) => (
                      <Link
                        key={article.id}
                        href={`/help/${article.category.slug}/${article.slug}`}
                        className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-primary/30 hover:bg-white/[0.06] transition-all group"
                      >
                        <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            {article.is_pinned && (
                              <Pin className="w-3 h-3 text-yellow-500 shrink-0" />
                            )}
                            {article.is_official && (
                              <span className="px-1.5 py-0.5 text-[10px] rounded bg-primary/20 text-primary shrink-0">
                                Official
                              </span>
                            )}
                            <span className="font-medium truncate">{article.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {article.reply_count} {article.reply_count === 1 ? "reply" : "replies"}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <HelpCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-2">Select a category</h2>
                <p className="text-sm text-muted-foreground">
                  Choose a category from the sidebar to browse articles.
                </p>
              </div>
            )}

            {/* Contact Support CTA */}
            <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Can&apos;t find what you&apos;re looking for?</h3>
                  <p className="text-sm text-muted-foreground">
                    Ask the community in the forum or contact support directly.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/help/forum">
                    <Button variant="outline" size="sm" className="gap-2">
                      <MessagesSquare className="w-4 h-4" />
                      Forum
                    </Button>
                  </Link>
                  <Link href={user ? "/help/tickets/new" : "/auth/login"}>
                    <Button size="sm" className="gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Contact Support
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
