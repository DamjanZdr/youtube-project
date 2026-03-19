"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Key, 
  CreditCard,
  LogOut,
  Shield,
  TicketIcon,
  HelpCircle,
  Mail,
  BarChart,
  Handshake,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Main navigation items
const mainNavItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/tickets", label: "Support Tickets", icon: TicketIcon, highlight: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/studios", label: "Studios", icon: Building2 },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/keys", label: "Keys", icon: Key },
  { href: "/admin/partners", label: "Partners", icon: Handshake },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart },
];

// Legacy items (greyed out)
const legacyNavItems = [
  { href: "/admin/waitlist", label: "Waitlist", icon: Mail, legacy: true },
];

// All items for mobile nav
const allNavItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/tickets", label: "Support Tickets", icon: TicketIcon, highlight: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/studios", label: "Studios", icon: Building2 },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/keys", label: "Keys", icon: Key },
  { href: "/admin/partners", label: "Partners", icon: Handshake },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart },
  { href: "/admin/waitlist", label: "Waitlist", icon: Mail, legacy: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Check if user has admin role in database
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "admin") {
        setIsAdmin(true);
      } else {
        router.push("/");
        return;
      }

      setLoading(false);
    }

    checkAdmin();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="h-screen bg-black flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-bold text-base">Admin Panel</h1>
        </div>
        <Link
          href="/"
          className="p-2 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </Link>
      </header>

      {/* Mobile Navigation Tabs */}
      <nav className="md:hidden flex overflow-x-auto hide-scrollbar border-b border-white/10 px-2">
        {allNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const isLegacy = 'legacy' in item && item.legacy;
          const isHighlight = 'highlight' in item && item.highlight;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors shrink-0",
                isActive 
                  ? "border-primary text-white" 
                  : "border-transparent text-muted-foreground hover:text-white",
                isLegacy && "opacity-50",
                isHighlight && !isActive && "text-orange-400"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-white/10 p-4 flex-col h-full shrink-0">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">Management Dashboard</p>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const isHighlight = 'highlight' in item && item.highlight;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  isActive 
                    ? "bg-white/10 text-white" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-white",
                  isHighlight && !isActive && "text-orange-400 hover:text-orange-300"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          
          {/* Legacy Section */}
          <div className="pt-2 mt-2 border-t border-white/5">
            <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground/50">Legacy</p>
            {legacyNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors opacity-50",
                    isActive 
                      ? "bg-white/10 text-white" 
                      : "text-muted-foreground hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 pt-4 mt-4 space-y-1">
          <Link
            href="/help"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-white transition-colors"
          >
            <HelpCircle className="w-5 h-5" />
            <span>Help Center</span>
          </Link>
          <a
            href="mailto:support@myblueprint.run"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-white transition-colors"
          >
            <Mail className="w-5 h-5" />
            <span>Contact</span>
          </a>
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Exit Admin</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto h-full p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
