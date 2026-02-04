"use client";

import { useState } from "react";
import { PanelLeftClose } from "lucide-react";
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
}

export function StudioSidebar({ studio, user, studioSlug }: StudioSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? "w-16" : "w-64";
  const headerPadding = collapsed ? "px-2" : "";
  const logoPadding = collapsed ? "w-10 h-10 mx-auto" : "w-10 h-10";
  const navPadding = collapsed ? "p-2" : "p-3";
  const footerPadding = collapsed ? "p-2" : "p-4";
  const userFlexAlign = collapsed ? "justify-center" : "gap-3";

  return (
    <>
      <aside className={`glass-sidebar border-r border-white/5 flex flex-col fixed h-screen transition-all duration-300 z-40 ${sidebarWidth}`}>
        {/* Sidebar Header */}
        <div className={`p-4 border-b border-white/5 ${headerPadding}`}>
          <div className="flex items-center gap-3">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setCollapsed(false)}
                    className={`${logoPadding} bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center border border-white/10 shrink-0 cursor-pointer hover:border-white/20 transition-colors`}
                  >
                    <img
                      src={studio.logo_url || "/bplogo.png"}
                      alt={studio.name}
                      className="w-full h-full object-cover bg-white/0"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Expand sidebar</TooltipContent>
              </Tooltip>
            ) : (
              <>
                <div className={`${logoPadding} bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center border border-white/10 shrink-0`}>
                  <img
                    src={studio.logo_url || "/bplogo.png"}
                    alt={studio.name}
                    className="w-full h-full object-cover bg-white/0"
                  />
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
          {/* User Profile Dropup */}
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
      {/* Spacer div that adjusts with sidebar */}
      <div className={`transition-all duration-300 shrink-0 ${sidebarWidth}`} />
    </>
  );
}
