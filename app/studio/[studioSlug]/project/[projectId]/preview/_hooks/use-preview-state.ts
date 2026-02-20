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
  compareShorts: YouTubeVideo[];
  setCompareShorts: (videos: YouTubeVideo[]) => void;
  // Cache functions
  getCachedResults: (title: string) => { videos: YouTubeVideo[]; shorts: YouTubeVideo[] } | null;
  setCachedResults: (title: string, videos: YouTubeVideo[], shorts: YouTubeVideo[]) => void;
}

const COMPARE_MODE_KEY = "preview-compare-mode";
const COMPARE_CACHE_KEY = "preview-compare-cache";

export function usePreviewState(): UsePreviewStateReturn {
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("feed");
  const [compareMode, setCompareModeState] = useState(false);
  const [compareVideos, setCompareVideos] = useState<YouTubeVideo[]>([]);
  const [compareShorts, setCompareShorts] = useState<YouTubeVideo[]>([]);

  // Load compare mode from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COMPARE_MODE_KEY);
      if (saved === "true") {
        setCompareModeState(true);
      }
    } catch {}
  }, []);

  // Persist compare mode to localStorage
  const setCompareMode = useCallback((value: boolean) => {
    setCompareModeState(value);
    try {
      localStorage.setItem(COMPARE_MODE_KEY, value.toString());
    } catch {}
  }, []);

  // Get cached results for a title
  const getCachedResults = useCallback((title: string): { videos: YouTubeVideo[]; shorts: YouTubeVideo[] } | null => {
    try {
      const cache = sessionStorage.getItem(COMPARE_CACHE_KEY);
      if (cache) {
        const parsed = JSON.parse(cache);
        if (parsed[title]) {
          return parsed[title];
        }
      }
    } catch {}
    return null;
  }, []);

  // Set cached results for a title
  const setCachedResults = useCallback((title: string, videos: YouTubeVideo[], shorts: YouTubeVideo[]) => {
    try {
      const cache = sessionStorage.getItem(COMPARE_CACHE_KEY);
      const parsed = cache ? JSON.parse(cache) : {};
      parsed[title] = { videos, shorts };
      sessionStorage.setItem(COMPARE_CACHE_KEY, JSON.stringify(parsed));
    } catch {}
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
    compareShorts,
    setCompareShorts,
    getCachedResults,
    setCachedResults,
  };
}
