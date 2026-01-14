/**
 * Script Server Actions
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createScriptSchema, updateScriptSchema } from '@/lib/validators';
import type { ApiResponse, Script } from '@/types';

export async function createScript(
  input: unknown
): Promise<ApiResponse<Script>> {
  const validated = createScriptSchema.safeParse(input);
  
  if (!validated.success) {
    return {
      data: null,
      error: validated.error.issues[0].message,
      success: false,
    };
  }

  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Unauthorized', success: false };
  }

  // TODO: Create script in database
  
  revalidatePath('/dashboard/scripts');
  
  return {
    data: null,
    error: null,
    success: true,
  };
}

export async function updateScript(
  input: unknown
): Promise<ApiResponse<Script>> {
  const validated = updateScriptSchema.safeParse(input);
  
  if (!validated.success) {
    return {
      data: null,
      error: validated.error.issues[0].message,
      success: false,
    };
  }

  const supabase = await createClient();
  
  // TODO: Update script in database
  
  revalidatePath('/dashboard/scripts');
  
  return {
    data: null,
    error: null,
    success: true,
  };
}

export async function deleteScript(scriptId: string): Promise<ApiResponse<null>> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Unauthorized', success: false };
  }

  // TODO: Delete script from database
  
  revalidatePath('/dashboard/scripts');
  
  return {
    data: null,
    error: null,
    success: true,
  };
}

/**
 * Calculate estimated video duration from word count
 * Average speaking pace: ~150 words per minute
 */
export function calculateDuration(wordCount: number): number {
  const wordsPerMinute = 150;
  return Math.ceil((wordCount / wordsPerMinute) * 60); // Return seconds
}
