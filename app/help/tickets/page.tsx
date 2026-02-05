"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Plus,
  TicketIcon,
  Clock,
  CheckCircle2,
  MessageCircle,
  Archive,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Ticket {
  id: string;
  ticket_number: number;
  subject: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
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

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");

  const supabase = createClient();

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/sign-in");
      return;
    }

    const { data: ticketData } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (ticketData) {
      setTickets(ticketData);
    }

    setLoading(false);
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (filter === "all") return true;
    if (filter === "open") return !["resolved", "archived"].includes(ticket.status);
    if (filter === "resolved") return ["resolved", "archived"].includes(ticket.status);
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/help"
                className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block"
              >
                ← Back to Help Center
              </Link>
              <h1 className="text-3xl font-bold">My Support Tickets</h1>
            </div>
            <Link href="/help/tickets/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Ticket
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: "all", label: "All Tickets" },
            { key: "open", label: "Open" },
            { key: "resolved", label: "Resolved" },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={filter === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(tab.key as "all" | "open" | "resolved")}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Tickets List */}
        {filteredTickets.length === 0 ? (
          <div className="text-center py-16">
            <TicketIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {filter === "all" ? "No tickets yet" : `No ${filter} tickets`}
            </h2>
            <p className="text-muted-foreground mb-6">
              {filter === "all"
                ? "Create a new ticket to get help from our support team."
                : "You don't have any tickets in this category."}
            </p>
            {filter === "all" && (
              <Link href="/help/tickets/new">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Ticket
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => {
              const status = statusConfig[ticket.status] || statusConfig.new;
              const StatusIcon = status.icon;
              
              return (
                <Link
                  key={ticket.id}
                  href={`/help/tickets/${ticket.id}`}
                  className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10 transition-all"
                >
                  <div className={`p-2 rounded-lg ${status.color}`}>
                    <StatusIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">
                        #{ticket.ticket_number}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">
                        {categoryLabels[ticket.category] || ticket.category}
                      </span>
                    </div>
                    <h3 className="font-medium truncate">{ticket.subject}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
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
