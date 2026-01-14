/**
 * Project validation schemas
 */

import { z } from 'zod';

export const projectStatusSchema = z.enum([
  'idea',
  'script',
  'recording',
  'editing',
  'scheduled',
  'published',
]);

export const createProjectSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  channelId: z.string().uuid('Invalid channel ID'),
  status: projectStatusSchema.default('idea'),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  id: z.string().uuid('Invalid project ID'),
});

export const moveProjectSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  status: projectStatusSchema,
  position: z.number().int().min(0).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type MoveProjectInput = z.infer<typeof moveProjectSchema>;
