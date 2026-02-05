"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  TicketIcon,
  Clock,
  CheckCircle2,
  MessageCircle,
  Archive,
  AlertCircle,
  User,
  Send,
  Loader2,
  ExternalLink,
  Filter,
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
  user: {
    id: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  related_studio: {
    id: string;
    name: string;
  } | null;
  message_count?: number;
  last_message?: {
    content: string;
    is_admin: boolean;
    created_at: string;
  };
}

interface Message {
  id: string;
  content: string;
  is_admin: boolean;
  created_at: string;
  sender: {
    display_name: string;
    avatar_url: string | null;
  } | null;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  new: { label: "New", icon: AlertCircle, color: "text-blue-400", bgColor: "bg-blue-400/20" },
  awaiting_response: { label: "Awaiting", icon: Clock, color: "text-yellow-400", bgColor: "bg-yellow-400/20" },
  responded: { label: "Responded", icon: MessageCircle, color: "text-green-400", bgColor: "bg-green-400/20" },
  resolved: { label: "Resolved", icon: CheckCircle2, color: "text-emerald-400", bgColor: "bg-emerald-400/20" },
  archived: { label: "Archived", icon: Archive, color: "text-gray-400", bgColor: "bg-gray-400/20" },
};

const categoryLabels: Record<string, string> = {
  bug_report: "Bug",
  feature_request: "Feature",
  billing_issue: "Billing",
  account_help: "Account",
  technical_support: "Tech",
  other: "Other",
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selected ticket state
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadTickets();
  }, [filter]);

  const loadTickets = async () => {
    setLoading(true);

    let query = supabase
      .from("support_tickets")
      .select(`
        *,
        user:profiles!user_id(id, email, display_name, avatar_url),
        related_studio:organizations(id, name)
      `)
      .order("updated_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;

    if (data) {
      // Get message counts and last message for each ticket
      const ticketsWithMessages = await Promise.all(
        data.map(async (ticket) => {
          const { count } = await supabase
            .from("support_ticket_messages")
            .select("*", { count: "exact", head: true })
            .eq("ticket_id", ticket.id);

          const { data: lastMsg } = await supabase
            .from("support_ticket_messages")
            .select("content, is_admin, created_at")
            .eq("ticket_id", ticket.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          return {
            ...ticket,
            message_count: count || 0,
            last_message: lastMsg || undefined,
          };
        })
      );

      setTickets(ticketsWithMessages as Ticket[]);
    }

    setLoading(false);
  };

  const loadMessages = async (ticketId: string) => {
    setLoadingMessages(true);

    const { data } = await supabase
      .from("support_ticket_messages")
      .select(`
        id,
        content,
        is_admin,
        created_at,
        sender:profiles!sender_id(display_name, avatar_url)
      `)
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data as unknown as Message[]);
    }

    setLoadingMessages(false);
  };

  const selectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    await loadMessages(ticket.id);
  };

  const sendReply = async () => {
    if (!selectedTicket || !replyContent.trim()) return;

    setSubmitting(true);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      setSubmitting(false);
      return;
    }

    // Insert message as admin
    const { error } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: selectedTicket.id,
        sender_id: user.id,
        content: replyContent.trim(),
        is_admin: true,
      });

    if (error) {
      toast.error("Failed to send reply");
      console.error(error);
    } else {
      toast.success("Reply sent");
      setReplyContent("");
      await loadMessages(selectedTicket.id);
      await loadTickets();
      
      // Update selected ticket status
      setSelectedTicket(prev => prev ? { ...prev, status: "responded" } : null);
    }

    setSubmitting(false);
  };

  const updateStatus = async (ticketId: string, newStatus: string) => {
    const updates: Record<string, unknown> = { status: newStatus };
    
    if (newStatus === "resolved") {
      updates.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("support_tickets")
      .update(updates)
      .eq("id", ticketId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Ticket marked as ${statusConfig[newStatus]?.label || newStatus}`);
      await loadTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
      }
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.subject.toLowerCase().includes(query) ||
      ticket.user?.email?.toLowerCase().includes(query) ||
      ticket.user?.display_name?.toLowerCase().includes(query) ||
      ticket.ticket_number.toString().includes(query)
    );
  });

  // Count by status
  const statusCounts = tickets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground">Manage customer support requests</p>
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-180px)]">
        {/* Ticket List */}
        <div className="w-[400px] flex flex-col glass-card overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-white/10 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tickets..."
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
              >
                All ({tickets.length})
              </Button>
              {["new", "awaiting_response", "responded", "resolved"].map((status) => {
                const config = statusConfig[status];
                return (
                  <Button
                    key={status}
                    size="sm"
                    variant={filter === status ? "default" : "outline"}
                    onClick={() => setFilter(status)}
                    className="gap-1"
                  >
                    <config.icon className={`w-3 h-3 ${filter !== status ? config.color : ""}`} />
                    {statusCounts[status] || 0}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Ticket List */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <TicketIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No tickets found</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {filteredTickets.map((ticket) => {
                  const status = statusConfig[ticket.status] || statusConfig.new;
                  const isSelected = selectedTicket?.id === ticket.id;
                  
                  return (
                    <button
                      key={ticket.id}
                      onClick={() => selectTicket(ticket)}
                      className={`w-full p-4 text-left hover:bg-white/5 transition-colors ${
                        isSelected ? "bg-white/10" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg shrink-0 ${status.bgColor}`}>
                          <status.icon className={`w-4 h-4 ${status.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-muted-foreground">
                              #{ticket.ticket_number}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-white/10">
                              {categoryLabels[ticket.category]}
                            </span>
                          </div>
                          <h3 className="font-medium text-sm truncate">{ticket.subject}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground truncate">
                              {ticket.user?.display_name || ticket.user?.email || "Unknown"}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
                            </span>
                          </div>
                          {ticket.last_message && (
                            <p className="text-xs text-muted-foreground mt-2 truncate">
                              {ticket.last_message.is_admin ? "You: " : ""}
                              {ticket.last_message.content}
                            </p>
                          )}
                        </div>
                        {ticket.message_count && ticket.message_count > 0 && (
                          <span className="text-xs px-2 py-1 rounded-full bg-white/10 shrink-0">
                            {ticket.message_count}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Message View */}
        <div className="flex-1 glass-card flex flex-col overflow-hidden">
          {selectedTicket ? (
            <>
              {/* Ticket Header */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-muted-foreground">
                        #{selectedTicket.ticket_number}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">
                        {categoryLabels[selectedTicket.category]}
                      </span>
                      {selectedTicket.related_studio && (
                        <Link 
                          href={`/admin/studios?search=${selectedTicket.related_studio.name}`}
                          className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary hover:bg-primary/30"
                        >
                          {selectedTicket.related_studio.name}
                        </Link>
                      )}
                    </div>
                    <h2 className="text-lg font-semibold truncate">{selectedTicket.subject}</h2>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{selectedTicket.user?.display_name}</span>
                      <span className="text-xs">({selectedTicket.user?.email})</span>
                    </div>
                  </div>
                  <Select
                    value={selectedTicket.status}
                    onValueChange={(value) => updateStatus(selectedTicket.id, value)}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            <config.icon className={`w-4 h-4 ${config.color}`} />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-auto p-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${message.is_admin ? "flex-row-reverse" : ""}`}
                      >
                        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
                          message.is_admin ? "bg-primary/20" : "bg-white/10"
                        }`}>
                          {message.sender?.avatar_url ? (
                            <img src={message.sender.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className={`max-w-[70%] ${message.is_admin ? "text-right" : ""}`}>
                          <div
                            className={`inline-block p-3 rounded-xl ${
                              message.is_admin
                                ? "bg-primary/20 rounded-tr-none"
                                : "bg-white/10 rounded-tl-none"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap text-left">{message.content}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(message.created_at), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply Input */}
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-3">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type your reply..."
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
                    className="px-4 shrink-0"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TicketIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a ticket to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
