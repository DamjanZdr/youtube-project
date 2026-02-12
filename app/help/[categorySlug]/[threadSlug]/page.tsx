"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { UserProfileDropdown } from "@/components/shared/user-profile-dropdown";
import { RichTextEditor } from "@/components/help/rich-text-editor";
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
  LayoutGrid,
  X,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import React from "react";

// Custom text renderer to highlight @mentions
const renderTextWithMentions = (text: string) => {
  const parts = text.split(/(@[a-z0-9_]+)/gi);
  return parts.map((part, i) => {
    if (part.match(/^@[a-z0-9_]+$/i)) {
      return (
        <span key={i} className="text-primary font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
};

// Custom components for ReactMarkdown to highlight @mentions
const markdownComponents = {
  p: ({ children, ...props }: any) => {
    const processChildren = (child: any): any => {
      if (typeof child === 'string') {
        return renderTextWithMentions(child);
      }
      return child;
    };
    return <p {...props}>{React.Children.map(children, processChildren)}</p>;
  }
};

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
    username: string | null;
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
  parent_reply_id: string | null;
  author: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  children?: Reply[];
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
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyToAuthor, setReplyToAuthor] = useState<string | null>(null);
  const [replyLocation, setReplyLocation] = useState<string | null>(null); // "thread" | reply.id | null

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
        author_id
      `)
      .eq("category_id", cat.id)
      .eq("slug", threadSlug)
      .single();

    if (!threadData) {
      setLoading(false);
      return;
    }

    // Load replies
    const { data: replyData } = await supabase
      .from("help_thread_replies")
      .select(`
        id,
        content,
        is_official,
        created_at,
        author_id,
        parent_reply_id
      `)
      .eq("thread_id", threadData.id)
      .order("created_at", { ascending: true });

    // Fetch all author profiles from public_profiles view (secure - no email)
    const allAuthorIds = [
      threadData.author_id,
      ...(replyData?.map(r => r.author_id) || [])
    ].filter(Boolean);
    const uniqueAuthorIds = [...new Set(allAuthorIds)];
    
    const { data: authorData } = await supabase
      .from("public_profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", uniqueAuthorIds);
    
    const authorMap = new Map(authorData?.map(a => [a.id, a]) || []);

    // Set thread with author
    setThread({ 
      ...threadData, 
      category: cat,
      author: authorMap.get(threadData.author_id) || null
    } as unknown as Thread);

    // Increment view count
    await supabase
      .from("help_threads")
      .update({ view_count: (threadData.view_count || 0) + 1 })
      .eq("id", threadData.id);

    if (replyData) {
      // Organize replies into tree structure (1 level nesting)
      const topLevel: Reply[] = [];
      const childMap: Record<string, Reply[]> = {};

      replyData.forEach((reply) => {
        const replyWithChildren = { 
          ...reply, 
          author: authorMap.get(reply.author_id) || null,
          children: [] 
        } as unknown as Reply;
        if (reply.parent_reply_id) {
          if (!childMap[reply.parent_reply_id]) {
            childMap[reply.parent_reply_id] = [];
          }
          childMap[reply.parent_reply_id].push(replyWithChildren);
        } else {
          topLevel.push(replyWithChildren);
        }
      });

      // Attach children to their parents
      topLevel.forEach((reply) => {
        reply.children = childMap[reply.id] || [];
      });

      setReplies(topLevel);
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
        parent_reply_id: replyToId,
      });

    if (error) {
      toast.error("Failed to post reply");
      console.error(error);
    } else {
      toast.success("Reply posted");
      setReplyContent("");
      setReplyToId(null);
      setReplyToAuthor(null);
      setReplyLocation(null);
      loadData(); // Reload to show new reply
    }

    setSubmitting(false);
  };

  // Handle clicking reply on a reply
  const handleReplyToReply = (replyId: string, authorName: string, authorUsername: string | null, isChild: boolean, parentReplyId?: string) => {
    // If it's a child reply or we're replying to a parent, set the appropriate parent
    const targetParentId = isChild ? parentReplyId : replyId;
    setReplyToId(targetParentId || null);
    
    // For child replies, auto-mention the author using username if available
    if (isChild) {
      const mention = authorUsername || authorName.toLowerCase().replace(/\s+/g, "_");
      setReplyContent(`@${mention}\u00A0`); // Use non-breaking space so HTML doesn't collapse it
    } else {
      setReplyContent("");
    }
    setReplyToAuthor(authorName);
    setReplyLocation(replyId); // Show form under this reply
  };

  // Handle clicking reply on the main thread
  const handleReplyToThread = () => {
    setReplyToId(null);
    setReplyToAuthor(null);
    setReplyContent("");
    setReplyLocation("thread");
  };

  const cancelReplyTo = () => {
    setReplyToId(null);
    setReplyToAuthor(null);
    setReplyContent("");
    setReplyLocation(null);
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
      // Redirect to forum for user threads, category page for official threads
      if (thread.is_official) {
        router.push(`/help/${categorySlug}`);
      } else {
        router.push("/help/forum");
      }
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
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Top Navigation - Bottom on mobile, top on desktop */}
      <header className="fixed bottom-0 md:sticky md:top-0 md:bottom-auto left-0 right-0 z-50 glass-strong border-t md:border-t-0 md:border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center h-14 md:h-16 px-2">
            <img
              src="/bplogo.png"
              alt="Logo"
              className="max-h-10 md:max-h-12 object-contain"
              style={{ width: 'auto', height: '100%' }}
            />
          </Link>
          
          <div className="flex items-center gap-2 md:gap-3">
            {user ? (
              <>
                <Link href="/hub">
                  <Button variant="ghost" size="sm" className="gap-2 px-2 md:px-3">
                    <LayoutGrid className="w-4 h-4" />
                    <span className="hidden sm:inline">Hub</span>
                  </Button>
                </Link>
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

      {/* Breadcrumb Header */}
      <div className="border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 md:py-6">
          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
            <Link href="/help" className="hover:text-foreground">
              Help Center
            </Link>
            <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
            {thread.is_official ? (
              <Link href={`/help/self-help?category=${categorySlug}`} className="hover:text-foreground truncate">
                {thread.category.name}
              </Link>
            ) : (
              <Link href="/help/forum" className="hover:text-foreground truncate">
                Public Forum
              </Link>
            )}
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {thread.is_pinned && <Pin className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-500" />}
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
              <h1 className="text-base md:text-lg font-normal text-foreground/90">{thread.title}</h1>
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

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Original Post */}
        {editingThread ? (
          <div className="mb-6 md:mb-8 p-4 md:p-6 rounded-xl bg-white/5 border border-white/10">
            <h3 className="font-medium mb-4">Edit Article</h3>
            <Input
              value={editThreadTitle}
              onChange={(e) => setEditThreadTitle(e.target.value)}
              placeholder="Title"
              className="mb-4"
            />
            <div className="mb-4">
              <RichTextEditor
                value={editThreadContent}
                onChange={setEditThreadContent}
                placeholder="Content (supports Markdown)"
                rows={16}
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditingThread(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={saveThreadEdit} disabled={savingThread} className="w-full sm:w-auto">
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
        <div className="mb-6 md:mb-8 p-4 md:p-6 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-start justify-between gap-3 md:gap-4 mb-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                {thread.author?.avatar_url ? (
                  <img src={thread.author.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm md:text-base">
                    {thread.author?.full_name || (thread.is_official ? "System" : "Unknown")}
                  </span>
                  {thread.is_official && (
                    <Shield className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
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
          <article className="max-w-none text-[15px] leading-relaxed text-foreground/80
            [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mt-0 [&_h1]:mb-2
            [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-0 [&_h2]:mb-2
            [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-0 [&_h3]:mb-1
            [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-foreground [&_h4]:mt-0 [&_h4]:mb-1
            [&_p]:my-0 [&_p]:mb-2
            [&_li]:my-0
            [&_ul]:my-0 [&_ul]:mb-2 [&_ul]:pl-6 [&_ul]:list-disc
            [&_ol]:my-0 [&_ol]:mb-2 [&_ol]:pl-6 [&_ol]:list-decimal
            [&_strong]:font-semibold [&_strong]:text-foreground
            [&_em]:italic
            [&_a]:text-primary [&_a]:underline hover:[&_a]:text-primary/80
            [&_blockquote]:border-l-4 [&_blockquote]:border-white/20 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-0 [&_blockquote]:mb-2
            [&_pre]:bg-black/30 [&_pre]:rounded [&_pre]:p-3 [&_pre]:my-0 [&_pre]:mb-2
            [&_code]:bg-black/30 [&_code]:rounded [&_code]:px-1 [&_code]:text-sm [&_code]:font-mono
            [&_hr]:border-white/20 [&_hr]:my-4
            [&_u]:underline
          ">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm, remarkBreaks]}
              rehypePlugins={[rehypeRaw]}
            >
              {thread.content}
            </ReactMarkdown>
          </article>
          <div className="flex items-center gap-3 md:gap-4 mt-4 md:mt-6 pt-4 border-t border-white/10 text-xs md:text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>{thread.view_count} views</span>
            </div>
            {!thread.is_official && (
              <div className="flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span>{thread.reply_count} replies</span>
              </div>
            )}
            {/* Reply button for main thread */}
            {user && !thread.is_locked && !thread.is_official && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground h-7 px-2 ml-auto"
                onClick={handleReplyToThread}
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                Reply
              </Button>
            )}
          </div>
          
          {/* Inline reply form for main thread */}
          {replyLocation === "thread" && user && !thread.is_locked && !thread.is_official && (
            <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Replying to thread</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                  onClick={cancelReplyTo}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Cancel
                </Button>
              </div>
              <div className="mb-3">
                <RichTextEditor
                  value={replyContent}
                  onChange={setReplyContent}
                  placeholder="Write your reply..."
                  rows={4}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={submitReply}
                  disabled={submitting || !replyContent.trim()}
                  size="sm"
                  className="gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Post Reply
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Replies - hidden for official threads */}
        {!thread.is_official && replies.length > 0 && (
          <div className="mb-6 md:mb-8">
            <h2 className="text-sm font-medium text-muted-foreground mb-4">
              {replies.reduce((acc, r) => acc + 1 + (r.children?.length || 0), 0)} {replies.reduce((acc, r) => acc + 1 + (r.children?.length || 0), 0) === 1 ? "Reply" : "Replies"}
            </h2>
            <div className="space-y-4">
              {replies.map((reply) => (
                <div key={reply.id}>
                <div
                  className={`p-4 rounded-lg border ${
                    reply.is_official
                      ? "bg-primary/10 border-primary/30"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  {editingReplyId === reply.id ? (
                    <div>
                      <div className="mb-3">
                        <RichTextEditor
                          value={editReplyContent}
                          onChange={setEditReplyContent}
                          placeholder="Edit your reply..."
                          rows={6}
                        />
                      </div>
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
                            {reply.author?.full_name || (reply.is_official ? "System" : "Unknown")}
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
                  <div className="max-w-none text-[15px] leading-relaxed text-foreground/80 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-0 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-0 [&_h3]:mb-1 [&_p]:my-0 [&_p]:mb-2 [&_li]:my-0 [&_ul]:my-0 [&_ul]:mb-2 [&_ul]:pl-6 [&_ul]:list-disc [&_ol]:my-0 [&_ol]:mb-2 [&_ol]:pl-6 [&_ol]:list-decimal [&_strong]:font-semibold [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-white/20 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-0 [&_blockquote]:mb-2 [&_pre]:bg-black/30 [&_pre]:rounded [&_pre]:p-3 [&_pre]:my-0 [&_pre]:mb-2 [&_code]:bg-black/30 [&_code]:rounded [&_code]:px-1 [&_u]:underline">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      rehypePlugins={[rehypeRaw]}
                      components={markdownComponents}
                    >
                      {reply.content}
                    </ReactMarkdown>
                  </div>
                  {/* Reply button for top-level replies */}
                  {user && !thread.is_locked && (
                    <div className="mt-3 pt-2 border-t border-white/5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                        onClick={() => handleReplyToReply(reply.id, reply.author?.full_name || "Unknown", reply.author?.username || null, false)}
                      >
                        <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                        Reply
                      </Button>
                    </div>
                  )}
                  
                  {/* Inline reply form for this reply */}
                  {replyLocation === reply.id && user && !thread.is_locked && (
                    <div className="mt-3 p-3 rounded-lg bg-black/20 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">
                          Replying to <span className="text-primary">@{reply.author?.username || reply.author?.full_name || "Unknown"}</span>
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground hover:text-foreground h-6 px-1.5"
                          onClick={cancelReplyTo}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="mb-2">
                        <RichTextEditor
                          value={replyContent}
                          onChange={setReplyContent}
                          placeholder="Write your reply..."
                          rows={3}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          onClick={submitReply}
                          disabled={submitting || !replyContent.trim()}
                          size="sm"
                          className="gap-1.5 h-7 text-xs"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Posting...
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3" />
                              Reply
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                  </>
                  )}
                </div>

                {/* Nested replies (conversations) */}
                {reply.children && reply.children.length > 0 && (
                  <div className="ml-6 md:ml-10 mt-2 space-y-2 border-l-2 border-white/10 pl-4">
                    {reply.children.map((childReply) => (
                      <div
                        key={childReply.id}
                        className={`p-3 rounded-lg ${
                          childReply.is_official
                            ? "bg-primary/10 border border-primary/30"
                            : "bg-white/[0.03]"
                        }`}
                      >
                        {editingReplyId === childReply.id ? (
                          <div>
                            <div className="mb-3">
                              <RichTextEditor
                                value={editReplyContent}
                                onChange={setEditReplyContent}
                                placeholder="Edit your reply..."
                                rows={4}
                              />
                            </div>
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
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                              {childReply.author?.avatar_url ? (
                                <img src={childReply.author.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-3 h-3 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-xs">
                                {childReply.author?.full_name || "Unknown"}
                              </span>
                              {childReply.is_official && (
                                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-primary/20 text-primary">
                                  Staff
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(childReply.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>

                          {canEditReply(childReply) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreHorizontal className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => startEditReply(childReply)}>
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteReplyId(childReply.id)}
                                  className="text-red-400 focus:text-red-400"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        <div className="text-sm leading-relaxed text-foreground/80 [&_p]:my-0 [&_p]:mb-1 [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold [&_u]:underline">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                            rehypePlugins={[rehypeRaw]}
                            components={markdownComponents}
                          >
                            {childReply.content}
                          </ReactMarkdown>
                        </div>
                        {/* Reply button for child replies (auto @mention) */}
                        {user && !thread.is_locked && (
                          <div className="mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[10px] text-muted-foreground hover:text-foreground h-6 px-1.5"
                              onClick={() => handleReplyToReply(childReply.id, childReply.author?.full_name || "Unknown", childReply.author?.username || null, true, reply.id)}
                            >
                              <MessageCircle className="w-3 h-3 mr-1" />
                              Reply
                            </Button>
                          </div>
                        )}
                        
                        {/* Inline reply form for child reply */}
                        {replyLocation === childReply.id && user && !thread.is_locked && (
                          <div className="mt-2 p-2 rounded bg-black/20 border border-white/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] text-muted-foreground">
                                Replying to <span className="text-primary">@{childReply.author?.username || childReply.author?.full_name || "Unknown"}</span>
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] text-muted-foreground hover:text-foreground h-5 px-1"
                                onClick={cancelReplyTo}
                              >
                                <X className="w-2.5 h-2.5" />
                              </Button>
                            </div>
                            <div className="mb-2">
                              <RichTextEditor
                                value={replyContent}
                                onChange={setReplyContent}
                                placeholder="Write your reply..."
                                rows={2}
                              />
                            </div>
                            <div className="flex justify-end">
                              <Button
                                onClick={submitReply}
                                disabled={submitting || !replyContent.trim()}
                                size="sm"
                                className="gap-1 h-6 text-[10px] px-2"
                              >
                                {submitting ? (
                                  <>
                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                    Posting...
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-2.5 h-2.5" />
                                    Reply
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                        </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status messages for locked/not signed in */}
        {thread.is_locked && !thread.is_official && (
          <div className="p-4 md:p-6 rounded-xl bg-white/5 border border-white/10 text-center">
            <Lock className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-xs md:text-sm">This thread is locked and no longer accepting replies.</p>
          </div>
        )}
        
        {!user && !thread.is_locked && !thread.is_official && (
          <div className="p-4 md:p-6 rounded-xl bg-white/5 border border-white/10 text-center">
            <p className="text-muted-foreground text-sm mb-4">Sign in to post a reply</p>
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
