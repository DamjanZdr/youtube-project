/**
 * UI State Store (Zustand)
 * Global UI state management
 */

import { create } from 'zustand';
import type { ModalState } from '@/types';

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Modal
  modal: ModalState;
  openModal: (type: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Command palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Active organization
  activeOrganizationId: string | null;
  setActiveOrganizationId: (id: string | null) => void;

  // Active channel
  activeChannelId: string | null;
  setActiveChannelId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Sidebar
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Modal
  modal: { isOpen: false, type: null },
  openModal: (type, data) => set({ modal: { isOpen: true, type, data } }),
  closeModal: () => set({ modal: { isOpen: false, type: null, data: undefined } }),

  // Command palette
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  // Active organization
  activeOrganizationId: null,
  setActiveOrganizationId: (id) => set({ activeOrganizationId: id }),

  // Active channel
  activeChannelId: null,
  setActiveChannelId: (id) => set({ activeChannelId: id }),
}));
