"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  LogOut,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NavLinks } from "./nav-links";

interface StudioSidebarProps {
  studio: {
    name: string;
    logo_url: string | null;
  };
  user: any;
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
            <div className={`${logoPadding} rounded-xl bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center border border-white/10 shrink-0`}>
              <img
                src={studio.logo_url || "/bplogo.png"}
                alt={studio.name}
                className="w-full h-full rounded-xl object-cover bg-white/0"
              />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="px-2 py-1">
                  <span className="font-semibold line-clamp-2 break-words">{studio.name}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 ${navPadding}`}>
          <NavLinks studioSlug={studioSlug} collapsed={collapsed} />
        </nav>

        {/* Sidebar Footer */}
        <div className={`border-t border-white/5 ${footerPadding}`}>
          {/* Back to Hub */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link 
                  href="/hub" 
                  className="flex items-center justify-center w-full h-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors mb-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Back to Hub</TooltipContent>
            </Tooltip>
          ) : (
            <Link 
              href="/hub" 
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 px-3 py-2 rounded-xl hover:bg-white/5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Hub
            </Link>
          )}

          {/* Action Buttons */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setCollapsed(false)}
                  className="w-full h-10"
                >
                  <PanelLeft className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <form action="/auth/sign-out" method="post" className="flex-1">
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                      <LogOut className="w-4 h-4 scale-x-[-1]" />
                      Logout
                    </Button>
                  </form>
                </TooltipTrigger>
                <TooltipContent>Sign out</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setCollapsed(true)}
                    className="h-9 w-9"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Collapse sidebar</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>
      {/* Spacer div that adjusts with sidebar */}
      <div className={`transition-all duration-300 shrink-0 ${sidebarWidth}`} />
    </>
  );
}
