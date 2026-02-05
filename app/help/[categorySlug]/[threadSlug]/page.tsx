"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { UserProfileDropdown } from "@/components/shared/user-profile-dropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ChevronRight,
  Pin,
  Lock,
  MessageCircle,
  Eye,
  Send,
  Loader2,
  Shield,
  User,
  MoreHorizontal,
  Pencil,
  Trash2,
  PinOff,
  LockOpen,
  ShieldOff,
  ShieldCheck,
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
  author_id: string | null;
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
  author_id: string | null;
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
  const [user, setUser] = useState<{ id: string; email: string; full_name?: string | null; avatar_url?: string | null } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [acceptInvites, setAcceptInvites] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit states
  const [editingThread, setEditingThread] = useState(false);
  const [editThreadTitle, setEditThreadTitle] = useState("");
  const [editThreadContent, setEditThreadContent] = useState("");
  const [savingThread, setSavingThread] = useState(false);

  // Edit reply states
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyContent, setEditReplyContent] = useState("");
  const [savingReply, setSavingReply] = useState(false);

  // Delete states
  const [deleteThreadDialog, setDeleteThreadDialog] = useState(false);
  const [deleteReplyId, setDeleteReplyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();
    checkUser();
  }, [categorySlug, threadSlug]);

  const checkUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (authUser) {
      // Fetch user profile with admin status
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_admin, full_name, avatar_url, accept_invites")
        .eq("id", authUser.id)
        .single();

      console.log("Profile data:", profile, "Error:", error);

      setUser({
        id: authUser.id,
        email: authUser.email || "",
        full_name: profile?.full_name,
        avatar_url: profile?.avatar_url,
      });
      setIsAdmin(profile?.is_admin === true);
      setAcceptInvites(profile?.accept_invites ?? true);
    } else {
      setUser(null);
    }
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
        author_id,
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
        author_id,
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

  // Admin actions
  const togglePin = async () => {
    if (!thread) return;
    const { error } = await supabase
      .from("help_threads")
      .update({ is_pinned: !thread.is_pinned })
      .eq("id", thread.id);

    if (error) {
      toast.error("Failed to update");
    } else {
      toast.success(thread.is_pinned ? "Unpinned" : "Pinned");
      loadData();
    }
  };

  const toggleLock = async () => {
    if (!thread) return;
    const { error } = await supabase
      .from("help_threads")
      .update({ is_locked: !thread.is_locked })
      .eq("id", thread.id);

    if (error) {
      toast.error("Failed to update");
    } else {
      toast.success(thread.is_locked ? "Unlocked" : "Locked");
      loadData();
    }
  };

  const toggleOfficial = async () => {
    if (!thread) return;
    const { error } = await supabase
      .from("help_threads")
      .update({ is_official: !thread.is_official })
      .eq("id", thread.id);

    if (error) {
      toast.error("Failed to update");
    } else {
      toast.success(thread.is_official ? "Unmarked as official" : "Marked as official");
      loadData();
    }
  };

  const startEditThread = () => {
    if (!thread) return;
    setEditThreadTitle(thread.title);
    setEditThreadContent(thread.content);
    setEditingThread(true);
  };

  const saveThreadEdit = async () => {
    if (!thread || !editThreadTitle.trim() || !editThreadContent.trim()) return;

    setSavingThread(true);

    const { error } = await supabase
      .from("help_threads")
      .update({
        title: editThreadTitle.trim(),
        content: editThreadContent.trim(),
      })
      .eq("id", thread.id);

    if (error) {
      toast.error("Failed to save changes");
    } else {
      toast.success("Article updated");
      setEditingThread(false);
      loadData();
    }

    setSavingThread(false);
  };

  const deleteThread = async () => {
    if (!thread) return;

    setDeleting(true);

    // Delete replies first
    await supabase
      .from("help_thread_replies")
      .delete()
      .eq("thread_id", thread.id);

    // Delete thread
    const { error } = await supabase
      .from("help_threads")
      .delete()
      .eq("id", thread.id);

    if (error) {
      toast.error("Failed to delete");
      setDeleting(false);
    } else {
      toast.success("Article deleted");
      router.push(`/help/${categorySlug}`);
    }
  };

  const startEditReply = (reply: Reply) => {
    setEditingReplyId(reply.id);
    setEditReplyContent(reply.content);
  };

  const saveReplyEdit = async () => {
    if (!editingReplyId || !editReplyContent.trim()) return;

    setSavingReply(true);

    const { error } = await supabase
      .from("help_thread_replies")
      .update({ content: editReplyContent.trim() })
      .eq("id", editingReplyId);

    if (error) {
      toast.error("Failed to save changes");
    } else {
      toast.success("Reply updated");
      setEditingReplyId(null);
      setEditReplyContent("");
      loadData();
    }

    setSavingReply(false);
  };

  const deleteReply = async () => {
    if (!deleteReplyId) return;

    setDeleting(true);

    const { error } = await supabase
      .from("help_thread_replies")
      .delete()
      .eq("id", deleteReplyId);

    if (error) {
      toast.error("Failed to delete reply");
    } else {
      toast.success("Reply deleted");
      setDeleteReplyId(null);
      loadData();
    }

    setDeleting(false);
  };

  const canEditThread = user && (isAdmin || thread?.author_id === user.id);
  const canEditReply = (reply: Reply) => user && (isAdmin || reply.author_id === user.id);

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

      {/* Breadcrumb Header */}
      <div className="border-b border-white/10">
        <div className="max-w-5xl mx-auto px-8 py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/help" className="hover:text-foreground">
              Help Center
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link href={`/help/${categorySlug}`} className="hover:text-foreground">
              {thread.category.name}
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
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
              <h1 className="text-lg font-normal text-foreground/90">{thread.title}</h1>
            </div>

            {/* Admin controls */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={startEditThread}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Article
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={togglePin}>
                    {thread.is_pinned ? (
                      <>
                        <PinOff className="w-4 h-4 mr-2" />
                        Unpin
                      </>
                    ) : (
                      <>
                        <Pin className="w-4 h-4 mr-2" />
                        Pin to Top
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={toggleLock}>
                    {thread.is_locked ? (
                      <>
                        <LockOpen className="w-4 h-4 mr-2" />
                        Unlock
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Lock Thread
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={toggleOfficial}>
                    {thread.is_official ? (
                      <>
                        <ShieldOff className="w-4 h-4 mr-2" />
                        Remove Official
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Mark as Official
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteThreadDialog(true)}
                    className="text-red-400 focus:text-red-400"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Article
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Original Post */}
        {editingThread ? (
          <div className="mb-8 p-6 rounded-xl bg-white/5 border border-white/10">
            <h3 className="font-medium mb-4">Edit Article</h3>
            <Input
              value={editThreadTitle}
              onChange={(e) => setEditThreadTitle(e.target.value)}
              placeholder="Title"
              className="mb-4"
            />
            <Textarea
              value={editThreadContent}
              onChange={(e) => setEditThreadContent(e.target.value)}
              placeholder="Content (supports Markdown)"
              rows={16}
              className="mb-4 font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditingThread(false)}>
                Cancel
              </Button>
              <Button onClick={saveThreadEdit} disabled={savingThread}>
                {savingThread ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        ) : (
        <div className="mb-8 p-6 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
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

            {/* Author edit/delete dropdown (non-admin) */}
            {canEditThread && !isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={startEditThread}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Thread
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteThreadDialog(true)}
                    className="text-red-400 focus:text-red-400"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Thread
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <article className="prose prose-neutral dark:prose-invert max-w-none
            prose-headings:font-normal prose-headings:text-foreground/90
            prose-h1:text-lg prose-h1:mt-0 prose-h1:mb-6
            prose-h2:text-[15px] prose-h2:mt-8 prose-h2:mb-3 prose-h2:text-foreground/80
            prose-h3:text-[14px] prose-h3:mt-6 prose-h3:mb-2 prose-h3:text-foreground/70
            prose-h4:text-[14px] prose-h4:mt-4 prose-h4:mb-2 prose-h4:text-foreground/70
            prose-h5:text-[13px] prose-h5:mt-4 prose-h5:mb-2 prose-h5:text-foreground/60
            prose-p:text-[15px] prose-p:leading-7 prose-p:text-muted-foreground prose-p:my-4
            prose-li:text-[15px] prose-li:leading-7 prose-li:text-muted-foreground prose-li:my-1
            prose-ul:my-4 prose-ol:my-4
            prose-strong:font-medium prose-strong:text-foreground/90
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-table:text-sm prose-th:font-normal prose-th:text-foreground/80
            prose-code:text-sm prose-code:font-normal
          ">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {thread.content}
            </ReactMarkdown>
          </article>
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
        )}

        {/* Replies */}
        {replies.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-muted-foreground mb-4">
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
                  {editingReplyId === reply.id ? (
                    <div>
                      <Textarea
                        value={editReplyContent}
                        onChange={(e) => setEditReplyContent(e.target.value)}
                        rows={4}
                        className="mb-3"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingReplyId(null);
                            setEditReplyContent("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={saveReplyEdit} disabled={savingReply}>
                          {savingReply ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                  <>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
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

                    {/* Reply actions */}
                    {canEditReply(reply) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startEditReply(reply)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Reply
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteReplyId(reply.id)}
                            className="text-red-400 focus:text-red-400"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Reply
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-normal prose-p:text-[15px] prose-p:leading-7 prose-p:text-muted-foreground prose-li:text-[15px] prose-li:text-muted-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {reply.content}
                    </ReactMarkdown>
                  </div>
                  </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reply Form */}
        {user && !thread.is_locked ? (
          <div className="p-6 rounded-xl bg-white/5 border border-white/10">
            <h3 className="font-medium text-sm mb-4">Post a Reply</h3>
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
            <p className="text-muted-foreground text-sm">This thread is locked and no longer accepting replies.</p>
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

      {/* Delete Thread Dialog */}
      <Dialog open={deleteThreadDialog} onOpenChange={setDeleteThreadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Article</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this article? This will also delete all replies. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteThreadDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteThread} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Reply Dialog */}
      <Dialog open={!!deleteReplyId} onOpenChange={(open) => !open && setDeleteReplyId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Reply</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this reply? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteReplyId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteReply} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
