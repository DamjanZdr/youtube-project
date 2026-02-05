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
  thread_count?: number;
}

interface Thread {
  id: string;
  title: string;
  slug: string;
  is_pinned: boolean;
  is_official: boolean;
  reply_count: number;
  created_at: string;
  category: {
    slug: string;
  };
}

export default function HelpCenterPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentThreads, setRecentThreads] = useState<Thread[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string; full_name?: string | null; avatar_url?: string | null } | null>(null);
  const [acceptInvites, setAcceptInvites] = useState(true);

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
        .select("full_name, avatar_url, accept_invites")
        .eq("id", authUser.id)
        .single();
      
      setUser({
        id: authUser.id,
        email: authUser.email || "",
        full_name: profile?.full_name,
        avatar_url: profile?.avatar_url,
      });
      setAcceptInvites(profile?.accept_invites ?? true);
    } else {
      setUser(null);
    }
  };

  const loadData = async () => {
    // Load categories with thread counts
    const { data: cats } = await supabase
      .from("help_categories")
      .select("*")
      .order("position");

    if (cats) {
      // Get thread counts for each category
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
    }

    // Load recent/pinned threads
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
        category:help_categories(slug)
      `)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    if (threads) {
      setRecentThreads(threads as unknown as Thread[]);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation - Same as Hub */}
      <header className="sticky top-0 z-50 glass-strong border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center h-16 px-2">
            <img
              src="/bplogo.png"
              alt="Logo"
              className="max-h-12 object-contain"
              style={{ width: 'auto', height: '100%' }}
            />
          </Link>
          
          <div className="flex items-center gap-4">
            {user ? (
              <UserProfileDropdown 
                user={user} 
                initialAcceptInvites={acceptInvites} 
              />
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">Sign in</Button>
                </Link>
                <Link href="/auth/sign-up">
                  <Button size="sm">Sign up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <div className="border-b border-white/10 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Help Center</h1>
            <p className="text-muted-foreground text-lg">
              Find answers, guides, and get support
            </p>
          </div>

          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-lg bg-white/5 border-white/10"
            />
          </div>

          {/* Quick Actions */}
          {user && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <Link href="/help/tickets">
                <Button variant="outline" className="gap-2">
                  <TicketIcon className="w-4 h-4" />
                  My Tickets
                </Button>
              </Link>
              <Link href="/help/tickets/new">
                <Button className="gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Contact Support
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Categories Grid */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-6">Browse by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => {
              const Icon = iconMap[category.icon] || FileText;
              return (
                <Link
                  key={category.id}
                  href={`/help/${category.slug}`}
                  className="group p-6 rounded-xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/20 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                        {category.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {category.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {category.thread_count} {category.thread_count === 1 ? "article" : "articles"}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent/Featured Threads */}
        {recentThreads.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-6">Featured & Recent</h2>
            <div className="space-y-2">
              {recentThreads.map((thread) => (
                <Link
                  key={thread.id}
                  href={`/help/${thread.category.slug}/${thread.slug}`}
                  className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10 transition-all"
                >
                  <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {thread.is_pinned && (
                        <Pin className="w-3 h-3 text-yellow-500" />
                      )}
                      {thread.is_official && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
                          Official
                        </span>
                      )}
                      <span className="font-medium truncate">{thread.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {thread.reply_count} {thread.reply_count === 1 ? "reply" : "replies"}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Contact Support CTA */}
        <div className="mt-12 p-8 rounded-2xl bg-gradient-to-r from-primary/20 to-blue-500/20 border border-primary/20 text-center">
          <h2 className="text-2xl font-bold mb-2">Can't find what you're looking for?</h2>
          <p className="text-muted-foreground mb-6">
            Our support team is here to help you with any questions.
          </p>
          <Link href={user ? "/help/tickets/new" : "/sign-in"}>
            <Button size="lg" className="gap-2">
              <MessageCircle className="w-5 h-5" />
              {user ? "Contact Support" : "Sign in to Contact Support"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
