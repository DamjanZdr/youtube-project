"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  ChevronLeft,
  AlertCircle,
  HelpCircle,
  BookOpen,
  MessagesSquare,
  LayoutGrid,
  Shield,
  Handshake,
} from "lucide-react";
import { UserProfileDropdown } from "@/components/shared/user-profile-dropdown";
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
  const [user, setUser] = useState<{ id: string; email: string; full_name?: string | null; avatar_url?: string | null } | null>(null);
  const [acceptInvites, setAcceptInvites] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPartner, setIsPartner] = useState(false);

  // Scroll indicators state
  const tabsNavRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollIndicators = useCallback(() => {
    const nav = tabsNavRef.current;
    if (nav) {
      setCanScrollLeft(nav.scrollLeft > 0);
      setCanScrollRight(nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1);
    }
  }, []);

  useEffect(() => {
    const nav = tabsNavRef.current;
    if (nav) {
      updateScrollIndicators();
      nav.addEventListener('scroll', updateScrollIndicators);
      window.addEventListener('resize', updateScrollIndicators);
      return () => {
        nav.removeEventListener('scroll', updateScrollIndicators);
        window.removeEventListener('resize', updateScrollIndicators);
      };
    }
  }, [updateScrollIndicators, loading]);

  const supabase = createClient();

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      router.push("/sign-in");
      return;
    }

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

    const { data: ticketData } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", authUser.id)
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
            {user && (
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
            )}
          </div>
        </div>
      </header>

      {/* Sub-navigation */}
      <div className="border-b border-white/10 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 relative">
          {/* Left scroll indicator */}
          {canScrollLeft && (
            <button
              onClick={() => {
                const nav = tabsNavRef.current;
                if (nav) nav.scrollBy({ left: -150, behavior: 'smooth' });
              }}
              className="absolute left-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-r from-background via-background/80 to-transparent flex items-center justify-start md:hidden"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          
          <div 
            ref={tabsNavRef}
            className="flex items-center gap-1 h-12 overflow-x-auto scrollbar-hide"
          >
            <Link
              href="/help"
              className="flex items-center gap-2 px-4 h-full text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors shrink-0 whitespace-nowrap"
            >
              <HelpCircle className="w-4 h-4" />
              Help Center
            </Link>
            <Link
              href="/help/self-help"
              className="flex items-center gap-2 px-4 h-full text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors shrink-0 whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4" />
              Self Help
            </Link>
            <Link
              href="/help/forum"
              className="flex items-center gap-2 px-4 h-full text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors shrink-0 whitespace-nowrap"
            >
              <MessagesSquare className="w-4 h-4" />
              Public Forum
            </Link>
            <Link
              href="/help/tickets"
              className="flex items-center gap-2 px-4 h-full text-sm font-medium border-b-2 border-primary text-foreground shrink-0 whitespace-nowrap"
            >
              <TicketIcon className="w-4 h-4" />
              Contact Support
            </Link>
          </div>
          
          {/* Right scroll indicator */}
          {canScrollRight && (
            <button
              onClick={() => {
                const nav = tabsNavRef.current;
                if (nav) nav.scrollBy({ left: 150, behavior: 'smooth' });
              }}
              className="absolute right-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-background via-background/80 to-transparent flex items-center justify-end md:hidden"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">My Support Tickets</h1>
            </div>
            <Link href="/help/tickets/new">
              <Button className="gap-2 w-full sm:w-auto">
                <Plus className="w-4 h-4" />
                New Ticket
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
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
          <div className="text-center py-12 md:py-16">
            <TicketIcon className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg md:text-xl font-semibold mb-2">
              {filter === "all" ? "No tickets yet" : `No ${filter} tickets`}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground mb-6">
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
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 md:p-4 rounded-lg bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-3 sm:contents">
                    <div className={`p-2 rounded-lg ${status.color} shrink-0`}>
                      <StatusIcon className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div className="flex-1 min-w-0 sm:hidden">
                      <h3 className="font-medium text-sm truncate">{ticket.subject}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">#{ticket.ticket_number}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground sm:hidden" />
                  </div>
                  <div className="hidden sm:block flex-1 min-w-0">
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
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground sm:hidden">
                    <span>{categoryLabels[ticket.category] || ticket.category}</span>
                    <span>Updated {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}</span>
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
