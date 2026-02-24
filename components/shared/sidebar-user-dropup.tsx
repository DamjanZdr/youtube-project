"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, ChevronUp, Home, HelpCircle, Shield, Handshake } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface SidebarUserDropupProps {
  user: {
    id: string;
    email: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
  };
  initialAcceptInvites?: boolean;
  collapsed?: boolean;
  isMobile?: boolean;
}

export function SidebarUserDropup({ user, initialAcceptInvites = true, collapsed = false, isMobile = false }: SidebarUserDropupProps) {
  const supabase = createClient();
  const [acceptInvites, setAcceptInvites] = useState(initialAcceptInvites);
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPartner, setIsPartner] = useState(false);

  useEffect(() => {
    async function checkRoles() {
      // Check admin status
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      
      setIsAdmin(profile?.is_admin === true);

      // Check partner status
      const { data: partner } = await supabase
        .from("partners")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      
      setIsPartner(!!partner);
    }
    checkRoles();
  }, [user.id]);

  async function toggleAcceptInvites(enabled: boolean) {
    const { error } = await supabase
      .from("profiles")
      .update({ accept_invites: enabled })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to update setting");
    } else {
      setAcceptInvites(enabled);
      toast.success(enabled ? "Invites enabled" : "Invites disabled");
    }
  }

  const displayName = user.full_name || user.email?.split("@")[0] || "User";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {isMobile ? (
          <button data-tutorial="user-menu" className="flex flex-col items-center justify-center gap-1 min-w-[68px] px-2 py-2 text-muted-foreground hover:text-foreground transition-colors">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center border border-white/10 overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-medium">{initials}</span>
              )}
            </div>
            <span className="text-xs font-medium">Me</span>
          </button>
        ) : collapsed ? (
          <Button data-tutorial="user-menu" variant="ghost" size="icon" className="w-full h-10 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center border border-white/10 overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-medium">{initials}</span>
              )}
            </div>
          </Button>
        ) : (
          <Button data-tutorial="user-menu" variant="ghost" className="w-full justify-between px-3 py-2 h-auto hover:bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center border border-white/10 overflow-hidden shrink-0">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-medium">{initials}</span>
                )}
              </div>
              <p className="text-sm font-medium truncate">{displayName}</p>
            </div>
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align={isMobile ? "end" : collapsed ? "center" : "start"} 
        side={isMobile ? "top" : "top"} 
        className={isMobile ? "w-56 mb-2 z-[100]" : collapsed ? "w-56 mb-2 z-[100]" : "w-[calc(var(--radix-dropdown-menu-trigger-width))] mb-2 z-[100]"}
        sideOffset={isMobile ? 16 : collapsed ? 8 : 8}
      >
        {/* Back to Hub - at top */}
        <DropdownMenuItem asChild>
          <Link href="/hub" className="flex items-center gap-2 cursor-pointer">
            <Home className="w-4 h-4" />
            Back to Hub
          </Link>
        </DropdownMenuItem>
        
        {/* Admin Panel */}
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="flex items-center gap-2 cursor-pointer text-orange-400">
              <Shield className="w-4 h-4" />
              Admin Panel
            </Link>
          </DropdownMenuItem>
        )}

        {/* Partner Dashboard */}
        {isPartner && (
          <DropdownMenuItem asChild>
            <Link href="/partner" className="flex items-center gap-2 cursor-pointer text-blue-400">
              <Handshake className="w-4 h-4" />
              Partner Dashboard
            </Link>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        {/* Account Settings */}
        <DropdownMenuItem asChild>
          <Link href="/account" className="flex items-center gap-2 cursor-pointer">
            <Settings className="w-4 h-4" />
            Account Settings
          </Link>
        </DropdownMenuItem>
        
        {/* Help Center */}
        <DropdownMenuItem asChild>
          <Link href="/help" className="flex items-center gap-2 cursor-pointer">
            <HelpCircle className="w-4 h-4" />
            Help Center
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Accept Invites Toggle */}
        <div 
          className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer rounded-sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleAcceptInvites(!acceptInvites);
          }}
        >
          <span className="text-sm">Accept Invites</span>
          <Switch
            checked={acceptInvites}
            onCheckedChange={toggleAcceptInvites}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        
        <DropdownMenuSeparator />
        
        {/* Sign Out */}
        <DropdownMenuItem asChild>
          <form action="/auth/sign-out" method="post" className="w-full">
            <button type="submit" className="flex items-center gap-2 w-full text-left text-red-400 hover:text-red-300">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
