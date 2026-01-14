/**
 * Central export for all types
 */

// Database entity types
export * from './database';

// Re-export Supabase types when generated
// export type { Database } from './supabase';

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// Form Types
// ============================================================================

export interface SelectOption {
  label: string;
  value: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface ModalState {
  isOpen: boolean;
  type: string | null;
  data?: Record<string, unknown>;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
}
