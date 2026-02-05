"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { UserProfileDropdown } from "@/components/shared/user-profile-dropdown";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Pin,
  Plus,
  MessageCircle,
  Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
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
  author: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function CategoryPage() {
  const params = useParams();
  const categorySlug = params.categorySlug as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string; full_name?: string | null; avatar_url?: string | null } | null>(null);
  const [acceptInvites, setAcceptInvites] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadData();
    checkUser();
  }, [categorySlug]);

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
    // Load category
    const { data: cat } = await supabase
      .from("help_categories")
      .select("*")
      .eq("slug", categorySlug)
      .single();

    if (!cat) {
      setLoading(false);
      return;
    }

    setCategory(cat);

    // Load threads
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
        author:profiles!author_id(full_name, avatar_url)
      `)
      .eq("category_id", cat.id);

    if (threadData) {
      // Sort: pinned first (oldest pinned on top), then unpinned (newest first)
      const sorted = [...threadData].sort((a, b) => {
        // Pinned articles come first
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        
        // Within pinned: oldest first (ascending)
        if (a.is_pinned && b.is_pinned) {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        
        // Within unpinned: newest first (descending)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setThreads(sorted as unknown as Thread[]);
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

  if (!category) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Category not found</h1>
          <Link href="/help">
            <Button variant="outline">Back to Help Center</Button>
          </Link>
        </div>
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
              className="max-h-12 object-contain bg-white/0"
              style={{ boxShadow: "0 2px 8px 0 rgba(8, 138, 250, 0.08)", width: 'auto', height: '100%' }}
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

      {/* Category Header */}
      <div className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link
            href="/help"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Help Center
          </Link>
          <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
          <p className="text-muted-foreground">{category.description}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Actions */}
        {user && (
          <div className="flex justify-end mb-6">
            <Link href={`/help/${categorySlug}/new`}>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Thread
              </Button>
            </Link>
          </div>
        )}

        {/* Threads List */}
        {threads.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No threads yet</h2>
            <p className="text-muted-foreground mb-6">
              Be the first to start a discussion in this category.
            </p>
            {user && (
              <Link href={`/help/${categorySlug}/new`}>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Thread
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((thread) => (
              <Link
                key={thread.id}
                href={`/help/${categorySlug}/${thread.slug}`}
                className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {thread.is_pinned && (
                      <Pin className="w-3 h-3 text-yellow-500" />
                    )}
                    {thread.is_official && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
                        Official
                      </span>
                    )}
                    {thread.is_locked && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">
                        Locked
                      </span>
                    )}
                    <span className="font-medium truncate">{thread.title}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      by {thread.author?.full_name || (thread.is_official ? "System" : "Unknown")}
                    </span>
                    <span>
                      {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-muted-foreground shrink-0">
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{thread.view_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    <span>{thread.reply_count}</span>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
