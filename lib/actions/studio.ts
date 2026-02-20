"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Generate a URL-friendly slug from a name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// Create a new studio (organization)
export async function createStudio(formData: FormData) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const name = formData.get("name") as string;
    
    if (!name || name.trim().length === 0) {
      return { error: "Studio name is required" };
    }
    
    // Generate slug and ensure uniqueness with sequential numbering
    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let suffix = 2;
    
    while (true) {
      const { data: existing } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", slug)
        .single();
      
      if (!existing) break;
      
      slug = `${baseSlug}-${suffix}`;
      suffix++;
      
      if (suffix > 100) break; // safety limit
    }
    
    // Must have a real authenticated user to create studios
    // The profiles table requires a valid auth.users reference
    if (!user) {
      return { error: "You must be logged in to create a studio. Please sign up or log in first." };
    }
    
    const ownerId = user.id;
    
    // Ensure profile exists for this user
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", ownerId)
      .single();
    
    if (!existingProfile) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: ownerId,
          email: user.email || "",
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User"
        });
      
      if (profileError) {
        console.error("Profile creation error:", profileError);
        return { error: "Failed to create user profile: " + profileError.message };
      }
    }
    

    // Use admin client for storage operations that may bypass RLS
    const adminClient = createAdminClient();

    // Prepare logo upload if present
    let logoUrl: string | null = null;
    const logoFile = formData.get("logo");
    if (logoFile && logoFile instanceof File && logoFile.size > 0) {
      // Validate file size (max 4MB)
      if (logoFile.size > 4 * 1024 * 1024) {
        return { error: "Logo file is too large. Maximum size is 4MB." };
      }
      
      const fileExt = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
      const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
      if (!validExtensions.includes(fileExt)) {
        return { error: "Invalid image format. Please use JPG, PNG, or WebP." };
      }
      
      const fileName = `logos/${slug}-${Date.now()}.${fileExt}`;
      // Convert File to Buffer for server-side upload
      const arrayBuffer = await logoFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { error: uploadError } = await adminClient.storage
        .from('studio-assets')
        .upload(fileName, buffer, { 
          upsert: true,
          contentType: logoFile.type 
        });
      if (uploadError) {
        console.error("Logo upload error:", uploadError);
        // Don't fail studio creation, just skip the logo
      } else {
        const { data: { publicUrl } } = adminClient.storage
          .from('studio-assets')
          .getPublicUrl(fileName);
        logoUrl = publicUrl;
      }
    }

  // Check if user selected a paid plan
  const selectedPlan = formData.get("selectedPlan") as string || "free";
  const isPaidPlan = selectedPlan !== "free";

  // Create the studio
  // If paid plan selected, create as 'pending' until checkout completes
  const { data: studio, error } = await supabase
    .from("organizations")
    .insert({
      name: name.trim(),
      slug,
      owner_id: ownerId,
      logo_url: logoUrl,
      status: isPaidPlan ? "pending" : "active",
      checkout_plan: isPaidPlan ? selectedPlan : null
    })
    .select()
    .single();

  if (error) {
    console.error("Create studio error:", error);
    return { error: error.message };
  }

  // Add owner as a member with owner role
  const { error: memberError } = await adminClient
    .from("organization_members")
    .insert({
      organization_id: studio.id,
      user_id: ownerId,
      role: "owner",
      status: "active"
    });

  if (memberError) {
    console.error("Failed to add owner as member:", memberError);
    // Clean up the created organization if we couldn't add the member
    await adminClient.from("organizations").delete().eq("id", studio.id);
    return { error: "Failed to create studio membership: " + memberError.message };
  }

  // Create a default channel for the studio
  await adminClient
    .from("channels")
    .insert({
      organization_id: studio.id,
      name: `${name} Channel`
    });

  // Create default board statuses with tasks using database function
  await adminClient.rpc('create_default_board_statuses', { org_id: studio.id });

  // Only create subscription for free plan studios
  // Paid plan studios will get their subscription created after checkout completes
  if (!isPaidPlan) {
    await adminClient
      .from("subscriptions")
      .insert({
        organization_id: studio.id,
        plan: "free",
        status: "active",
        source: null,
        interval: null
      });
  }

  revalidatePath("/hub");
  
  return { success: true, slug: studio.slug, id: studio.id, isPending: isPaidPlan };
  } catch (err) {
    console.error("Create studio error:", err);
    return { error: "An unexpected error occurred. Please try again." };
  }
}

// Get all studios for the current user
export async function getStudios() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || "00000000-0000-0000-0000-000000000000";
  
  // Get studios where user is a member
  const { data: memberships, error: memberError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId);
  
  if (memberError || !memberships?.length) {
    // Also check for studios owned by this user (fallback)
    const { data: ownedStudios, error: ownedError } = await supabase
      .from("organizations")
      .select(`
        id,
        name,
        slug,
        logo_url,
        status,
        created_at
      `)
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    
    if (ownedError) {
      console.error("Get studios error:", JSON.stringify(ownedError, null, 2));
      console.error("Error code:", ownedError.code);
      console.error("Error message:", ownedError.message);
      console.error("Error details:", ownedError.details);
      // If table doesn't exist, return empty array gracefully
      if (ownedError.code === "42P01" || ownedError.message?.includes("does not exist")) {
        return [];
      }
      return [];
    }
    
    return ownedStudios || [];
  }
  
  const orgIds = memberships.map(m => m.organization_id);
  
  const { data: studios, error } = await supabase
    .from("organizations")
    .select(`
      id,
      name,
      slug,
      logo_url,
      status,
      created_at
    `)
    .in("id", orgIds)
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("Get studios error:", error);
    return [];
  }
  
  // Get member counts and project counts
  const studiosWithCounts = await Promise.all(
    (studios || []).map(async (studio) => {
      const [{ count: memberCount }, { count: projectCount }] = await Promise.all([
        supabase
          .from("organization_members")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", studio.id),
        supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", studio.id)
      ]);
      
      return {
        ...studio,
        memberCount: memberCount || 1,
        projectCount: projectCount || 0
      };
    })
  );
  
  return studiosWithCounts;
}

// Delete a studio
export async function deleteStudio(studioId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", studioId);
  
  if (error) {
    return { error: error.message };
  }
  
  revalidatePath("/hub");
  return { success: true };
}