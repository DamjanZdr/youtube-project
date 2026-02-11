import { UpdatePasswordForm } from "@/components/update-password-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string; error_description?: string }>;
}) {
  const params = await searchParams;
  
  // Handle error from Supabase
  if (params.error) {
    redirect(`/auth/error?error=${encodeURIComponent(params.error_description || params.error)}`);
  }
  
  // If there's a code, exchange it for a session
  if (params.code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    
    if (error) {
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
  }
  
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
