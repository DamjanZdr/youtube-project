import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { AuthUserDropdown } from "./shared/auth-user-dropdown";

export async function AuthButton() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Fetch full profile data
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, accept_invites")
      .eq("id", user.id)
      .single();

    if (profile) {
      return (
        <AuthUserDropdown
          user={{
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          }}
          initialAcceptInvites={profile.accept_invites ?? true}
        />
      );
    }
  }

  return (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
