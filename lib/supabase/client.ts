import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  // Debug
  console.log("Creating Supabase client with URL:", url);
  console.log("Key starts with:", key?.substring(0, 10));
  
  if (!key || key.includes("your-")) {
    console.error("ERROR: Supabase key is not set correctly! Check .env.local");
  }
    
  return createBrowserClient(url, key);
}
