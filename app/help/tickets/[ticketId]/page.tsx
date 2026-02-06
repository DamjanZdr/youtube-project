"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ChevronLeft,
  Send,
  Loader2,
  User,
  Shield,
  Clock,
  CheckCircle2,
  MessageCircle,
  Archive,
  AlertCircle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Ticket {
  id: string;
  ticket_number: number;
  subject: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  related_studio: {
    name: string;
  } | null;
}

interface Message {
  id: string;
  content: string;
  is_admin: boolean;
  created_at: string;
  sender: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  new: { label: "New", icon: AlertCircle, color: "text-blue-400 bg-blue-400/20" },
  awaiting_response: { label: "Awaiting Response", icon: Clock, color: "text-yellow-400 bg-yellow-400/20" },
  responded: { label: "Responded", icon: MessageCircle, color: "text-green-400 bg-green-400/20" },
  resolved: { label: "Resolved", icon: CheckCircle2, color: "text-emerald-400 bg-emerald-400/20" },
  archived: { label: "Archived", icon: Archive, color: "text-gray-400 bg-gray-400/20" },
};

const categoryLabels: Record<string, string> = {
  bug_report: "Bug Report",
  feature_request: "Feature Request",
  billing_issue: "Billing Issue",
  account_help: "Account Help",
  technical_support: "Technical Support",
  other: "Other",
};

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.ticketId as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [reactivateReason, setReactivateReason] = useState("");
  const [reactivating, setReactivating] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    checkAuthAndLoad();
  }, [ticketId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const checkAuthAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/sign-in");
      return;
    }

    setUser(user);

    // Load ticket
    const { data: ticketData } = await supabase
      .from("support_tickets")
      .select(`
        *,
        related_studio:organizations(name)
      `)
      .eq("id", ticketId)
      .eq("user_id", user.id)
      .single();

    if (!ticketData) {
      router.push("/help/tickets");
      return;
    }

    setTicket(ticketData as Ticket);

    // Load messages
    await loadMessages();

    setLoading(false);
  };

  const loadMessages = async () => {
    const { data: messageData } = await supabase
      .from("support_ticket_messages")
      .select(`
        id,
        content,
        is_admin,
        created_at,
        sender:profiles!sender_id(full_name, avatar_url)
      `)
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (messageData) {
      setMessages(messageData as unknown as Message[]);
    }
  };

  const sendReply = async () => {
    if (!user || !ticket || !replyContent.trim()) return;

    setSubmitting(true);

    const { error } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        content: replyContent.trim(),
        is_admin: false,
      });

    if (error) {
      toast.error("Failed to send message");
      console.error(error);
    } else {
      toast.success("Message sent");
      setReplyContent("");
      await loadMessages();
      
      // Refresh ticket to get updated status
      const { data: updatedTicket } = await supabase
        .from("support_tickets")
        .select(`*, related_studio:organizations(name)`)
        .eq("id", ticketId)
        .single();
      
      if (updatedTicket) {
        setTicket(updatedTicket as Ticket);
      }
    }

    setSubmitting(false);
  };

  const reactivateTicket = async () => {
    if (!user || !ticket || !reactivateReason.trim()) return;

    setReactivating(true);

    // Update ticket status to awaiting_response (not new, since it's a reactivation)
    const { error: ticketError } = await supabase
      .from("support_tickets")
      .update({
        status: "awaiting_response",
        resolved_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket.id);

    if (ticketError) {
      toast.error("Failed to reactivate ticket");
      console.error(ticketError);
      setReactivating(false);
      return;
    }

    // Add a message explaining why the ticket was reactivated
    const { error: messageError } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        content: `Ticket Reactivated\n\nReason: ${reactivateReason.trim()}`,
        is_admin: false,
      });

    if (messageError) {
      console.error(messageError);
    }

    toast.success("Ticket reactivated");
    setShowReactivateDialog(false);
    setReactivateReason("");
    
    // Refresh ticket and messages
    const { data: updatedTicket } = await supabase
      .from("support_tickets")
      .select(`*, related_studio:organizations(name)`)
      .eq("id", ticket.id)
      .single();
    
    if (updatedTicket) {
      setTicket(updatedTicket as Ticket);
    }
    
    await loadMessages();
    setReactivating(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  const status = statusConfig[ticket.status] || statusConfig.new;
  const StatusIcon = status.icon;
  const isResolved = ["resolved", "archived"].includes(ticket.status);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 shrink-0">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Link
            href="/help/tickets"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Tickets
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">
                  Ticket #{ticket.ticket_number}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">
                  {categoryLabels[ticket.category] || ticket.category}
                </span>
                {ticket.related_studio && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                    {ticket.related_studio.name}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold truncate">{ticket.subject}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Created {format(new Date(ticket.created_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg shrink-0 ${status.color}`}>
              <StatusIcon className="w-4 h-4" />
              <span className="text-sm font-medium">{status.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.is_admin ? "" : "flex-row-reverse"}`}
              >
                <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${
                  message.is_admin ? "bg-primary/20" : "bg-white/10"
                }`}>
                  {message.is_admin ? (
                    <Shield className="w-5 h-5 text-primary" />
                  ) : message.sender?.avatar_url ? (
                    <img src={message.sender.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className={`flex-1 max-w-[80%] ${message.is_admin ? "" : "text-right"}`}>
                  <div
                    className={`inline-block p-4 rounded-2xl ${
                      message.is_admin
                        ? "bg-primary/20 rounded-tl-none"
                        : "bg-white/10 rounded-tr-none"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {message.is_admin ? "Support Team" : message.sender?.full_name || "You"}
                      </span>
                      {message.is_admin && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                          Staff
                        </span>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap text-left">{message.content}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Reply Input */}
      {!isResolved ? (
        <div className="border-t border-white/10 shrink-0">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex gap-4">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Type your message..."
                rows={2}
                className="resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    sendReply();
                  }
                }}
              />
              <Button
                onClick={sendReply}
                disabled={submitting || !replyContent.trim()}
                className="px-6 shrink-0"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Ctrl+Enter to send
            </p>
          </div>
        </div>
      ) : ticket.status === "resolved" ? (
        <div className="border-t border-white/10 shrink-0">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <p className="text-muted-foreground text-center">
                This ticket has been resolved.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReactivateDialog(true)}
                >
                  Issue not resolved?
                </Button>
                <span className="text-muted-foreground">or</span>
                <Link href="/help/tickets/new">
                  <Button variant="outline" size="sm">
                    Create new ticket
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-white/10 shrink-0">
          <div className="max-w-4xl mx-auto px-6 py-4 text-center">
            <p className="text-muted-foreground">
              This ticket has been archived and is no longer active.{" "}
              <Link href="/help/tickets/new" className="text-primary hover:underline">
                Create a new ticket
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Reactivate Dialog */}
      <Dialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate Ticket</DialogTitle>
            <DialogDescription>
              If your issue wasn't actually resolved, please explain what's still wrong so our team can help you further.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reactivateReason}
            onChange={(e) => setReactivateReason(e.target.value)}
            placeholder="Please explain why this ticket needs to be reopened..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => {
              setShowReactivateDialog(false);
              setReactivateReason("");
            }}>
              Cancel
            </Button>
            <Button 
              onClick={reactivateTicket}
              disabled={reactivating || !reactivateReason.trim()}
            >
              {reactivating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Reactivate Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
