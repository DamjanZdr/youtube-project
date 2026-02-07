"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronLeft, Send, Loader2, AlertCircle } from "lucide-react";

// All categories - some restricted by plan
const allCategories = [
  { value: "general_question", label: "General Question", description: "Pre-purchase questions or general inquiries", freeAllowed: true },
  { value: "bug_report", label: "Bug Report", description: "Something isn't working correctly", freeAllowed: false },
  { value: "feature_request", label: "Feature Request", description: "Suggest a new feature or improvement", freeAllowed: false },
  { value: "billing_issue", label: "Billing Issue", description: "Questions about payments or subscriptions", freeAllowed: false },
  { value: "account_help", label: "Account Help", description: "Login, settings, or account issues", freeAllowed: false },
  { value: "technical_support", label: "Technical Support", description: "Help with using Blueprint", freeAllowed: false },
  { value: "other", label: "Other", description: "Anything else", freeAllowed: false },
];

interface Studio {
  id: string;
  name: string;
  plan: string;
}

export default function NewTicketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [studios, setStudios] = useState<Studio[]>([]);

  // Form state
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [relatedStudioId, setRelatedStudioId] = useState<string>("");

  const supabase = createClient();

  // Get the selected studio's plan
  const selectedStudio = studios.find(s => s.id === relatedStudioId);
  const selectedPlan = selectedStudio?.plan || 'free';
  const isPaidPlan = selectedPlan !== 'free';
  
  // Filter categories based on plan
  const availableCategories = allCategories.filter(cat => isPaidPlan || cat.freeAllowed);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  // Reset category when studio changes if current category is no longer available
  useEffect(() => {
    if (category && !availableCategories.find(c => c.value === category)) {
      setCategory("");
    }
  }, [relatedStudioId]);

  const checkAuthAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/sign-in");
      return;
    }

    setUser(user);

    // Load user's studios with subscription info
    const { data: orgs } = await supabase
      .from("organization_members")
      .select(`
        organization:organizations(
          id, 
          name,
          subscription:subscriptions(plan)
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "active");

    if (orgs) {
      const studioList: Studio[] = [];
      for (const o of orgs) {
        const org = o.organization as unknown as { 
          id: string; 
          name: string;
          subscription: { plan: string } | null;
        } | null;
        if (org) {
          studioList.push({ 
            id: org.id, 
            name: org.name,
            plan: org.subscription?.plan || 'free'
          });
        }
      }
      setStudios(studioList);
    }


    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !subject.trim() || !category || !message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);

    // Create the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        subject: subject.trim(),
        category,
        related_studio_id: relatedStudioId && relatedStudioId !== "none" ? relatedStudioId : null,
      })
      .select()
      .single();

    if (ticketError || !ticket) {
      toast.error("Failed to create ticket");
      console.error(ticketError);
      setSubmitting(false);
      return;
    }

    // Add the initial message
    const { error: messageError } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        content: message.trim(),
        is_admin: false,
      });

    if (messageError) {
      toast.error("Ticket created but failed to add message");
      console.error(messageError);
    } else {
      toast.success("Ticket submitted successfully");
    }

    router.push(`/help/tickets/${ticket.id}`);
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
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <Link
            href="/help/tickets"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Tickets
          </Link>
          <h1 className="text-3xl font-bold">Contact Support</h1>
          <p className="text-muted-foreground mt-2">
            Describe your issue and we'll get back to you as soon as possible.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Studio Selection - FIRST */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Related Studio <span className="text-red-400">*</span>
            </label>
            <Select value={relatedStudioId} onValueChange={setRelatedStudioId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a studio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No studio (general question)</SelectItem>
                {studios.map((studio) => (
                  <SelectItem key={studio.id} value={studio.id}>
                    {studio.name} 
                    <span className="text-xs text-muted-foreground ml-2">
                      ({studio.plan === 'free' ? 'Free' : studio.plan.charAt(0).toUpperCase() + studio.plan.slice(1)})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select the studio this relates to. Support priority is based on your plan.
            </p>
          </div>

          {/* Plan-based notice */}
          {!isPaidPlan && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-400 font-medium">Free Plan - Limited Support</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Free users can submit general questions about plans and pricing. 
                    For full technical support, bug reports, and feature requests, 
                    upgrade to a paid plan.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Subject <span className="text-red-400">*</span>
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of your issue"
              maxLength={255}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Category <span className="text-red-400">*</span>
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isPaidPlan && (
              <p className="text-xs text-muted-foreground">
                Additional categories are available on paid plans.
              </p>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Message <span className="text-red-400">*</span>
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={!isPaidPlan 
                ? "What would you like to know about Blueprint? We're happy to answer questions about plans, features, and pricing."
                : "Please describe your issue in detail. Include any relevant information that might help us assist you better."
              }
              rows={8}
            />
            <p className="text-xs text-muted-foreground">
              The more details you provide, the faster we can help.
            </p>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4 pt-4">
            <Link href="/help/tickets">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !subject.trim() || !category || !message.trim()}
              className="gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Ticket
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
