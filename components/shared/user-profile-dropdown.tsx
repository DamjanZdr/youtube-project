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
import { User, Settings, LogOut, ChevronDown, HelpCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface UserProfileDropdownProps {
  user: {
    id: string;
    email: string;
    full_name?: string | null;
    avatar_url?: string | null;
  };
  initialAcceptInvites?: boolean;
}

export function UserProfileDropdown({ user, initialAcceptInvites = true }: UserProfileDropdownProps) {
  const supabase = createClient();
  const [acceptInvites, setAcceptInvites] = useState(initialAcceptInvites);
  const [open, setOpen] = useState(false);

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
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-white/10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center border border-white/10 overflow-hidden shrink-0">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-medium">{initials}</span>
            )}
          </div>
          <span className="text-sm hidden sm:inline-block max-w-[150px] truncate">{displayName}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
        {/* Accept Invites Toggle */}
        <div 
          className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer"
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
