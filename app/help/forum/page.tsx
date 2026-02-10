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
}

export default function ForumPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string; full_name?: string | null; avatar_url?: string | null } | null>(null);
  const [acceptInvites, setAcceptInvites] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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

    // Load all threads
    const { data: threadData } = await supabase
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
        author:profiles!author_id(full_name, avatar_url)
      `)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (threadData) {
      setThreads(threadData as unknown as Thread[]);
    }

    setLoading(false);
  };

  // Filter threads
  const filteredThreads = threads.filter((thread) => {
    if (selectedCategoryId && thread.category_id !== selectedCategoryId) return false;
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

      {/* Forum Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
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

          {/* Category filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !selectedCategoryId
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategoryId === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Threads List */}
        {filteredThreads.length === 0 ? (
          <div className="text-center py-16">
            <MessagesSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2 text-muted-foreground">
              {searchQuery || selectedCategoryId ? "No threads match your filter" : "No threads yet"}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || selectedCategoryId
                ? "Try adjusting your search or filter."
                : "Be the first to start a discussion!"}
            </p>
            {user && !searchQuery && !selectedCategoryId && (
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
              const CatIcon = iconMap[thread.category?.icon] || FileText;
              return (
                <Link
                  key={thread.id}
                  href={`/help/${thread.category.slug}/${thread.slug}`}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-primary/30 hover:bg-white/[0.06] transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {thread.is_pinned && (
                        <Pin className="w-3 h-3 text-yellow-500 shrink-0" />
                      )}
                      {thread.is_official && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-primary/20 text-primary shrink-0">
                          Official
                        </span>
                      )}
                      {thread.is_locked && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-red-500/20 text-red-400 shrink-0">
                          Locked
                        </span>
                      )}
                      <span className="font-medium truncate">{thread.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CatIcon className="w-3 h-3" />
                        {thread.category.name}
                      </span>
                      <span>
                        by {thread.author?.full_name || (thread.is_official ? "System" : "Unknown")}
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
    </div>
  );
}
