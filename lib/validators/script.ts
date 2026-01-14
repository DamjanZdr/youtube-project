/**
 * Script validation schemas
 */

import { z } from 'zod';

export const scriptSectionTypeSchema = z.enum([
  'intro',
  'hook',
  'content',
  'cta',
  'outro',
  'sponsor',
  'custom',
]);

export const createScriptSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  content: z.string().optional(),
});

export const updateScriptSchema = createScriptSchema.partial().extend({
  id: z.string().uuid('Invalid script ID'),
});

export const createScriptSectionSchema = z.object({
  scriptId: z.string().uuid('Invalid script ID'),
  type: scriptSectionTypeSchema,
  title: z.string().min(1, 'Title is required').max(100),
  content: z.string().default(''),
  notes: z.string().max(1000).optional(),
  visualCues: z.string().max(1000).optional(),
  position: z.number().int().min(0),
});

export const updateScriptSectionSchema = createScriptSectionSchema.partial().extend({
  id: z.string().uuid('Invalid section ID'),
});

export type CreateScriptInput = z.infer<typeof createScriptSchema>;
export type UpdateScriptInput = z.infer<typeof updateScriptSchema>;
export type CreateScriptSectionInput = z.infer<typeof createScriptSectionSchema>;
export type UpdateScriptSectionInput = z.infer<typeof updateScriptSectionSchema>;
