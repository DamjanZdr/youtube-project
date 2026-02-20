"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, Home, Tv, FolderKanban, Layout, BookOpen, Settings, ChevronLeft, ChevronRight, User, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NavLinks } from "./nav-links";
import { SidebarUserDropup } from "@/components/shared/sidebar-user-dropup";

interface StudioSidebarProps {
  studio: {
    name: string;
    logo_url: string | null;
  };
  user: {
    id: string;
    email: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
    accept_invites?: boolean;
  };
  studioSlug: string;
  subscription?: {
    plan: string;
    source?: 'stripe' | 'key';
    currentPeriodEnd?: string | null;
  } | null;
}

export function StudioSidebar({ studio, user, studioSlug, subscription }: StudioSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const sidebarWidth = collapsed ? "w-16" : "w-64";
  const headerPadding = collapsed ? "px-2" : "";
  const logoPadding = collapsed ? "w-10 h-10 mx-auto" : "w-10 h-10";
  const navPadding = collapsed ? "p-2" : "p-3";
  const footerPadding = collapsed ? "p-2" : "p-4";

  // Subscription state
  const isFreePlan = !subscription || subscription.plan === "free";
  const isGiftedPlan = subscription?.source === "key" && !isFreePlan;
  const expiresAt = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
  const daysUntilExpiry = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  
  // Show promo for: free users OR gifted users with expiring plans
  const showUpgradePromo = isFreePlan || (isGiftedPlan && expiresAt);

  // Mobile bottom nav items - all pages in scrollable nav
  const mobileNavItems = [
    { href: `/studio/${studioSlug}`, icon: Home, label: "Home" },
    { href: `/studio/${studioSlug}/projects`, icon: FolderKanban, label: "Projects" },
    { href: `/studio/${studioSlug}/board`, icon: Layout, label: "Board" },
    { href: `/studio/${studioSlug}/wiki`, icon: BookOpen, label: "Wiki" },
    // { href: `/studio/${studioSlug}/channel`, icon: Tv, label: "Channel" }, // Temporarily hidden - YouTube connection disabled
    { href: `/studio/${studioSlug}/settings`, icon: Settings, label: "Settings" },
  ];

  const isActive = (href: string) => {
    if (href === `/studio/${studioSlug}`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const displayName = user.full_name || user.email?.split("@")[0] || "User";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex glass-sidebar border-r border-white/5 flex-col fixed h-screen transition-all duration-300 z-40 ${sidebarWidth}`}>
        {/* Sidebar Header */}
        <div className={`p-4 border-b border-white/5 ${headerPadding}`}>
          <div className="flex items-center gap-3">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setCollapsed(false)}
                    className={`${logoPadding} bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center border border-white/10 shrink-0 cursor-pointer hover:border-white/20 transition-colors overflow-hidden`}
                  >
                    {studio.logo_url ? (
                      <img
                        src={studio.logo_url}
                        alt={studio.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold">{studio.name[0]}</span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Expand sidebar</TooltipContent>
              </Tooltip>
            ) : (
              <>
                <div className={`${logoPadding} bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center border border-white/10 shrink-0 overflow-hidden`}>
                  {studio.logo_url ? (
                    <img
                      src={studio.logo_url}
                      alt={studio.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold">{studio.name[0]}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <div className="min-w-0 overflow-hidden px-1">
                    <span className="font-semibold line-clamp-2 break-words">{studio.name}</span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setCollapsed(true)}
                        className="h-8 w-8 shrink-0"
                      >
                        <PanelLeftClose className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Collapse sidebar</TooltipContent>
                  </Tooltip>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 ${navPadding}`}>
          <NavLinks studioSlug={studioSlug} collapsed={collapsed} />
        </nav>

        {/* Upgrade Promo - Above the footer divider */}
        {showUpgradePromo && !collapsed && (
          <div className="px-3 pb-3">
            <Link 
              href={`/studio/${studioSlug}/settings?tab=billing`}
              className="block group"
            >
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-600/20 via-purple-600/20 to-fuchsia-600/20 p-4 border border-white/10 hover:border-white/20 transition-all">
                {/* Decorative glow */}
                <div className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 rounded-full blur-2xl group-hover:scale-110 transition-transform" />
                
                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">Go Pro</p>
                      <p className="text-xs text-white/60">
                        {isGiftedPlan && daysUntilExpiry !== null 
                          ? `${daysUntilExpiry}d left` 
                          : 'Unlock all'}
                      </p>
                    </div>
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-white text-xs font-semibold text-gray-900 group-hover:bg-white/90 transition-colors shrink-0">
                    Upgrade
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}
        {showUpgradePromo && collapsed && (
          <div className="px-2 pb-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link 
                  href={`/studio/${studioSlug}/settings?tab=billing`}
                  className="flex items-center justify-center w-full h-12 rounded-xl bg-gradient-to-br from-violet-600/20 via-purple-600/20 to-fuchsia-600/20 border border-white/10 hover:border-white/20 transition-all group"
                >
                  <Zap className="w-5 h-5 text-violet-400 group-hover:text-violet-300 transition-colors" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isGiftedPlan && daysUntilExpiry !== null
                  ? `${daysUntilExpiry} days left • Upgrade` 
                  : "Upgrade to Pro"}
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Sidebar Footer */}
        <div className={`border-t border-white/5 ${footerPadding}`}>
          <SidebarUserDropup 
            user={{
              id: user.id,
              email: user.email,
              full_name: user.full_name,
              avatar_url: user.avatar_url,
            }}
            initialAcceptInvites={user.accept_invites ?? true}
            collapsed={collapsed}
          />
        </div>
      </aside>

      {/* Desktop Spacer */}
      <div className={`hidden md:block transition-all duration-300 shrink-0 ${sidebarWidth}`} />

      {/* Mobile Bottom Navigation Bar - Scrollable with indicators */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-18 bg-background/95 backdrop-blur border-t border-white/10 z-50">
        {/* Left scroll indicator */}
        <button
          onClick={() => {
            const nav = document.getElementById('mobile-nav-scroll');
            if (nav) nav.scrollBy({ left: -100, behavior: 'smooth' });
          }}
          className="absolute left-0 top-0 bottom-0 z-10 w-6 bg-gradient-to-r from-background via-background/80 to-transparent flex items-center justify-start pl-0.5"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        
        <div id="mobile-nav-scroll" className="flex items-center h-full overflow-x-auto scrollbar-hide px-6 pb-safe">
          {mobileNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 min-w-[68px] px-2 py-2 transition-colors ${
                  active 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className={`w-6 h-6 ${active ? "scale-110" : ""} transition-transform`} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
          {/* Profile/Name button that opens dropup */}
          <SidebarUserDropup 
            user={{
              id: user.id,
              email: user.email,
              full_name: user.full_name,
              avatar_url: user.avatar_url,
            }}
            initialAcceptInvites={user.accept_invites ?? true}
            collapsed={false}
            isMobile={true}
          />
        </div>
        
        {/* Right scroll indicator */}
        <button
          onClick={() => {
            const nav = document.getElementById('mobile-nav-scroll');
            if (nav) nav.scrollBy({ left: 100, behavior: 'smooth' });
          }}
          className="absolute right-0 top-0 bottom-0 z-10 w-6 bg-gradient-to-l from-background via-background/80 to-transparent flex items-center justify-end pr-0.5"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </nav>
    </>
  );
}
