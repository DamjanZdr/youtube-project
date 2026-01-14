/**
 * Project Server Actions
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createProjectSchema, updateProjectSchema, moveProjectSchema } from '@/lib/validators';
import type { ApiResponse, Project } from '@/types';

export async function createProject(
  input: unknown
): Promise<ApiResponse<Project>> {
  const validated = createProjectSchema.safeParse(input);
  
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

  // TODO: Create project in database
  // const { data, error } = await supabase
  //   .from('projects')
  //   .insert(validated.data)
  //   .select()
  //   .single();

  revalidatePath('/dashboard/projects');
  
  return {
    data: null, // Replace with actual data
    error: null,
    success: true,
  };
}

export async function updateProject(
  input: unknown
): Promise<ApiResponse<Project>> {
  const validated = updateProjectSchema.safeParse(input);
  
  if (!validated.success) {
    return {
      data: null,
      error: validated.error.issues[0].message,
      success: false,
    };
  }

  const supabase = await createClient();
  
  // TODO: Update project in database
  
  revalidatePath('/dashboard/projects');
  
  return {
    data: null,
    error: null,
    success: true,
  };
}

export async function moveProject(
  input: unknown
): Promise<ApiResponse<Project>> {
  const validated = moveProjectSchema.safeParse(input);
  
  if (!validated.success) {
    return {
      data: null,
      error: validated.error.issues[0].message,
      success: false,
    };
  }

  const supabase = await createClient();
  
  // TODO: Update project status/position in database
  
  revalidatePath('/dashboard/projects');
  
  return {
    data: null,
    error: null,
    success: true,
  };
}

export async function deleteProject(projectId: string): Promise<ApiResponse<null>> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Unauthorized', success: false };
  }

  // TODO: Delete project from database
  
  revalidatePath('/dashboard/projects');
  
  return {
    data: null,
    error: null,
    success: true,
  };
}
