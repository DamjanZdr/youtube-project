"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, Home, Tv, FolderKanban, Layout, BookOpen, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NavLinks } from "./nav-links";
import { SidebarUserDropup } from "@/components/shared/sidebar-user-dropup";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
}

export function StudioSidebar({ studio, user, studioSlug }: StudioSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const sidebarWidth = collapsed ? "w-16" : "w-64";
  const headerPadding = collapsed ? "px-2" : "";
  const logoPadding = collapsed ? "w-10 h-10 mx-auto" : "w-10 h-10";
  const navPadding = collapsed ? "p-2" : "p-3";
  const footerPadding = collapsed ? "p-2" : "p-4";

  // Mobile bottom nav items (limited to 4 + more menu)
  const mobileNavItems = [
    { href: `/studio/${studioSlug}`, icon: Home, label: "Home" },
    { href: `/studio/${studioSlug}/projects`, icon: FolderKanban, label: "Projects" },
    { href: `/studio/${studioSlug}/board`, icon: Layout, label: "Board" },
    { href: `/studio/${studioSlug}/wiki`, icon: BookOpen, label: "Wiki" },
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

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur border-t border-white/10 z-50">
        <div className="flex items-center justify-around h-full px-2 pb-safe">
          {mobileNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                  active 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 ${active ? "scale-110" : ""} transition-transform`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          
          {/* More Menu (Profile + Settings + Channel) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-muted-foreground hover:text-foreground transition-colors">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center border border-white/10 overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-medium">{initials}</span>
                  )}
                </div>
                <span className="text-[10px] font-medium">More</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48 mb-2">
              <DropdownMenuItem asChild>
                <Link href={`/studio/${studioSlug}/channel`} className="flex items-center gap-2">
                  <Tv className="w-4 h-4" />
                  Channel
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/studio/${studioSlug}/settings`} className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/account" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/hub" className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Switch Studio
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Mobile Bottom Spacer */}
      <div className="md:hidden h-16 shrink-0" />
    </>
  );
}
