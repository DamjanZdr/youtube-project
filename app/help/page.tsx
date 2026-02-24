"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserProfileDropdown } from "@/components/shared/user-profile-dropdown";
import {
  MessageCircle,
  Search,
  HelpCircle,
  TicketIcon,
  ChevronRight,
  FileText,
  Pin,
  Eye,
  LayoutGrid,
  Shield,
  Loader2,
  X,
  BookOpen,
  MessagesSquare,
  Handshake,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Thread {
  id: string;
  title: string;
  slug: string;
  is_pinned: boolean;
  is_official: boolean;
  reply_count: number;
  view_count: number;
  created_at: string;
  category: {
    slug: string;
    name?: string;
  };
}

export default function HelpCenterPage() {
  const [recentThreads, setRecentThreads] = useState<Thread[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Thread[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 5;
  const [user, setUser] = useState<{ id: string; email: string; full_name?: string | null; avatar_url?: string | null } | null>(null);
  const [acceptInvites, setAcceptInvites] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPartner, setIsPartner] = useState(false);

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
      
      // Search both title and content
      const { data: threads } = await supabase
        .from("help_threads")
        .select(`
          id,
          title,
          slug,
          content,
          is_pinned,
          is_official,
          reply_count,
          created_at,
          category:help_categories(slug, name)
        `)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20);

      if (threads) {
        // Sort: title matches first, then content-only matches
        const sorted = [...threads].sort((a, b) => {
          const aInTitle = a.title.toLowerCase().includes(query);
          const bInTitle = b.title.toLowerCase().includes(query);
          if (aInTitle && !bInTitle) return -1;
          if (!aInTitle && bInTitle) return 1;
          return 0;
        });
        setSearchResults(sorted.slice(0, 10) as unknown as Thread[]);
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
        .select("full_name, avatar_url, accept_invites, is_admin")
        .eq("id", authUser.id)
        .single();
      
      setUser({
        id: authUser.id,
        email: authUser.email || "",
        full_name: profile?.full_name,
        avatar_url: profile?.avatar_url,
      });
      setAcceptInvites(profile?.accept_invites ?? true);
      setIsAdmin(profile?.is_admin === true);

      // Check partner status
      const { data: partner } = await supabase
        .from("partners")
        .select("id")
        .eq("user_id", authUser.id)
        .eq("is_active", true)
        .maybeSingle();
      setIsPartner(!!partner);
    } else {
      setUser(null);
    }
  };

  const loadData = async () => {
    const { data: threads } = await supabase
      .from("help_threads")
      .select(`
        id,
        title,
        slug,
        is_pinned,
        is_official,
        reply_count,
        view_count,
        created_at,
        category:help_categories(slug, name)
      `)
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);

    if (threads) {
      setRecentThreads(threads as unknown as Thread[]);
      setHasMore(threads.length === PAGE_SIZE);
    }

    setLoading(false);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const from = recentThreads.length;
    const { data: threads } = await supabase
      .from("help_threads")
      .select(`
        id,
        title,
        slug,
        is_pinned,
        is_official,
        reply_count,
        view_count,
        created_at,
        category:help_categories(slug, name)
      `)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (threads) {
      setRecentThreads((prev) => [...prev, ...(threads as unknown as Thread[])]);
      setHasMore(threads.length === PAGE_SIZE);
    }

    setLoadingMore(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
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
                {isPartner && (
                  <Link href="/partner">
                    <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 px-3 md:px-3 h-10 md:h-9">
                      <Handshake className="w-5 h-5 md:w-4 md:h-4 md:mr-2" />
                      <span className="hidden md:inline">Partner</span>
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

      {/* Hero Header */}
      <div className="border-b border-white/10 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-16">
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-primary/20 mb-3 md:mb-4">
              <HelpCircle className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            </div>
            <h1 className="text-2xl md:text-4xl font-bold mb-2">Help Center</h1>
            <p className="text-sm md:text-lg text-muted-foreground">
              Find answers, guides, and get support
            </p>
          </div>

          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            <Input
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 md:pl-12 pr-10 h-10 md:h-12 text-base md:text-lg bg-white/5 border-white/10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            
            {/* Search Results Dropdown */}
            {searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-white/10 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                {searching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="py-2">
                    {searchResults.map((thread) => (
                      <Link
                        key={thread.id}
                        href={`/help/${thread.category.slug}/${thread.slug}`}
                        onClick={() => setSearchQuery("")}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {thread.is_official && (
                              <span className="px-1.5 py-0.5 text-[10px] rounded bg-primary/20 text-primary">
                                Official
                              </span>
                            )}
                            <span className="font-medium truncate">{thread.title}</span>
                          </div>
                          {thread.category.name && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              in {thread.category.name}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <p>No results found for &quot;{searchQuery}&quot;</p>
                    <p className="text-sm mt-1">Try different keywords or browse categories below</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Three Main Options: Self Help, Public Forum & Contact Support */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 mt-8 md:mt-10">
            <Link
              href="/help/self-help"
              className="group w-full sm:w-60 p-6 md:p-8 rounded-xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10 transition-all text-center"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/20 text-primary group-hover:bg-primary group-hover:text-white transition-colors mb-4">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">Self Help</h3>
              <p className="text-sm text-muted-foreground">Browse guides &amp; articles</p>
            </Link>
            <Link
              href="/help/forum"
              className="group w-full sm:w-60 p-6 md:p-8 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all text-center"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors mb-4">
                <MessagesSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-1 group-hover:text-purple-400 transition-colors">Public Forum</h3>
              <p className="text-sm text-muted-foreground">Ask the community</p>
            </Link>
            <Link
              href="/help/tickets"
              className="group w-full sm:w-60 p-6 md:p-8 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-white/10 transition-all text-center"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors mb-4">
                <TicketIcon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-1 group-hover:text-emerald-400 transition-colors">Contact Support</h3>
              <p className="text-sm text-muted-foreground">Submit a ticket</p>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Posts */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6">Recent Posts</h2>
        <div className="space-y-2">
          {recentThreads.map((thread) => (
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
                  {thread.category.name && (
                    <span className="text-primary/70">{thread.category.name}</span>
                  )}
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

        {/* Load More */}
        {hasMore && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              onClick={loadMore}
              disabled={loadingMore}
              className="gap-2"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load More"
              )}
            </Button>
          </div>
        )}

        {!hasMore && recentThreads.length > 0 && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            You&apos;ve reached the end
          </p>
        )}
      </div>

      {/* Footer CTA */}
      <div className="border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-14">
          <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-r from-primary/20 to-blue-500/20 border border-primary/20 text-center">
            <h2 className="text-xl md:text-2xl font-bold mb-2">Can&apos;t find what you&apos;re looking for?</h2>
            <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
              Our support team is here to help you with any questions.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/help/forum">
                <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
                  <MessagesSquare className="w-5 h-5" />
                  Ask the Community
                </Button>
              </Link>
              <Link href={user ? "/help/tickets/new" : "/auth/login"}>
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  <MessageCircle className="w-5 h-5" />
                  {user ? "Contact Support" : "Sign in to Contact Support"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
