"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Pin,
  Lock,
  MessageCircle,
  Eye,
  Send,
  Loader2,
  Shield,
  User,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Thread {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_official: boolean;
  is_locked: boolean;
  view_count: number;
  reply_count: number;
  created_at: string;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  category: {
    name: string;
    slug: string;
  };
}

interface Reply {
  id: string;
  content: string;
  is_official: boolean;
  created_at: string;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function ThreadPage() {
  const params = useParams();
  const router = useRouter();
  const categorySlug = params.categorySlug as string;
  const threadSlug = params.threadSlug as string;

  const [thread, setThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();
    checkUser();
  }, [categorySlug, threadSlug]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadData = async () => {
    // Load category first
    const { data: cat } = await supabase
      .from("help_categories")
      .select("id, name, slug")
      .eq("slug", categorySlug)
      .single();

    if (!cat) {
      setLoading(false);
      return;
    }

    // Load thread
    const { data: threadData } = await supabase
      .from("help_threads")
      .select(`
        id,
        title,
        content,
        is_pinned,
        is_official,
        is_locked,
        view_count,
        reply_count,
        created_at,
        author:profiles!author_id(id, full_name, avatar_url)
      `)
      .eq("category_id", cat.id)
      .eq("slug", threadSlug)
      .single();

    if (!threadData) {
      setLoading(false);
      return;
    }

    setThread({ ...threadData, category: cat } as unknown as Thread);

    // Increment view count
    await supabase
      .from("help_threads")
      .update({ view_count: (threadData.view_count || 0) + 1 })
      .eq("id", threadData.id);

    // Load replies
    const { data: replyData } = await supabase
      .from("help_thread_replies")
      .select(`
        id,
        content,
        is_official,
        created_at,
        author:profiles!author_id(id, full_name, avatar_url)
      `)
      .eq("thread_id", threadData.id)
      .order("created_at", { ascending: true });

    if (replyData) {
      setReplies(replyData as unknown as Reply[]);
    }

    setLoading(false);
  };

  const submitReply = async () => {
    if (!thread || !user || !replyContent.trim()) return;

    setSubmitting(true);

    const { error } = await supabase
      .from("help_thread_replies")
      .insert({
        thread_id: thread.id,
        author_id: user.id,
        content: replyContent.trim(),
      });

    if (error) {
      toast.error("Failed to post reply");
      console.error(error);
    } else {
      toast.success("Reply posted");
      setReplyContent("");
      loadData(); // Reload to show new reply
    }

    setSubmitting(false);
  };

  // Render YouTube embeds in content
  const processYouTubeEmbeds = (content: string) => {
    return content.replace(
      /\[youtube:([a-zA-Z0-9_-]+)\]/g,
      '\n\n<youtube-embed video-id="$1"></youtube-embed>\n\n'
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Thread not found</h1>
          <Link href="/help">
            <Button variant="outline">Back to Help Center</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/help" className="hover:text-foreground">
              Help Center
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link href={`/help/${categorySlug}`} className="hover:text-foreground">
              {thread.category.name}
            </Link>
          </div>
          <div className="flex items-center gap-2 mb-2">
            {thread.is_pinned && <Pin className="w-4 h-4 text-yellow-500" />}
            {thread.is_official && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
                Official Guide
              </span>
            )}
            {thread.is_locked && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">
                Locked
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold">{thread.title}</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Original Post */}
        <div className="mb-8 p-6 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
              {thread.author?.avatar_url ? (
                <img src={thread.author.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {thread.author?.full_name || "Unknown"}
                </span>
                {thread.is_official && (
                  <Shield className="w-4 h-4 text-primary" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(thread.created_at), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
          </div>
          <div className="prose prose-invert prose-sm max-w-none prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-a:text-primary">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {thread.content}
            </ReactMarkdown>
          </div>
          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-white/10 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{thread.view_count} views</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{thread.reply_count} replies</span>
            </div>
          </div>
        </div>

        {/* Replies */}
        {replies.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">
              {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
            </h2>
            <div className="space-y-4">
              {replies.map((reply) => (
                <div
                  key={reply.id}
                  className={`p-4 rounded-lg border ${
                    reply.is_official
                      ? "bg-primary/10 border-primary/30"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                      {reply.author?.avatar_url ? (
                        <img src={reply.author.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {reply.author?.full_name || "Unknown"}
                        </span>
                        {reply.is_official && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
                            Staff
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none prose-p:text-muted-foreground prose-li:text-muted-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {reply.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reply Form */}
        {user && !thread.is_locked ? (
          <div className="p-6 rounded-xl bg-white/5 border border-white/10">
            <h3 className="font-semibold mb-4">Post a Reply</h3>
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write your reply..."
              rows={4}
              className="mb-4"
            />
            <div className="flex justify-end">
              <Button
                onClick={submitReply}
                disabled={submitting || !replyContent.trim()}
                className="gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Post Reply
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : thread.is_locked ? (
          <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
            <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">This thread is locked and no longer accepting replies.</p>
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
            <p className="text-muted-foreground mb-4">Sign in to post a reply</p>
            <Link href="/sign-in">
              <Button>Sign In</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
