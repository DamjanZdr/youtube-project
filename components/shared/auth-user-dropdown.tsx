"use client";

import { UserProfileDropdown } from "./user-profile-dropdown";

interface AuthUserDropdownProps {
  user: {
    id: string;
    email: string;
    full_name?: string | null;
    avatar_url?: string | null;
  };
  initialAcceptInvites?: boolean;
}

export function AuthUserDropdown({ user, initialAcceptInvites = true }: AuthUserDropdownProps) {
  return (
    <UserProfileDropdown 
      user={user} 
      initialAcceptInvites={initialAcceptInvites} 
    />
  );
}
