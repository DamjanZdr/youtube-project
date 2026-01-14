"use client";

import { useState, useCallback, useEffect } from "react";
import type { Orientation, PreviewMode, YouTubeVideo } from "../_components";

export interface UsePreviewStateReturn {
  currentSetIndex: number;
  setCurrentSetIndex: (index: number) => void;
  orientation: Orientation;
  setOrientation: (value: Orientation) => void;
  previewMode: PreviewMode;
  setPreviewMode: (value: PreviewMode) => void;
  compareMode: boolean;
  setCompareMode: (value: boolean) => void;
  compareVideos: YouTubeVideo[];
  setCompareVideos: (videos: YouTubeVideo[]) => void;
}

const STORAGE_KEY = "preview-state";

function getStoredState() {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function usePreviewState(): UsePreviewStateReturn {
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [orientation, setOrientationState] = useState<Orientation>("portrait");
  const [previewMode, setPreviewModeState] = useState<PreviewMode>("feed");
  const [compareMode, setCompareModeState] = useState(false);
  const [compareVideos, setCompareVideosState] = useState<YouTubeVideo[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = getStoredState();
    if (stored) {
      if (stored.orientation) setOrientationState(stored.orientation);
      if (stored.previewMode) setPreviewModeState(stored.previewMode);
      if (stored.compareMode !== undefined) setCompareModeState(stored.compareMode);
    }
    setIsHydrated(true);
  }, []);

  // Persist to localStorage when values change
  const setOrientation = useCallback((value: Orientation) => {
    setOrientationState(value);
    if (typeof window !== "undefined") {
      const stored = getStoredState() || {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, orientation: value }));
    }
  }, []);

  const setPreviewMode = useCallback((value: PreviewMode) => {
    setPreviewModeState(value);
    if (typeof window !== "undefined") {
      const stored = getStoredState() || {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, previewMode: value }));
    }
  }, []);

  const setCompareMode = useCallback((value: boolean) => {
    setCompareModeState(value);
    if (typeof window !== "undefined") {
      const stored = getStoredState() || {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, compareMode: value }));
    }
  }, []);

  const setCompareVideos = useCallback((videos: YouTubeVideo[]) => {
    setCompareVideosState(videos);
  }, []);

  return {
    currentSetIndex,
    setCurrentSetIndex,
    orientation,
    setOrientation,
    previewMode,
    setPreviewMode,
    compareMode,
    setCompareMode,
    compareVideos,
    setCompareVideos,
  };
}
