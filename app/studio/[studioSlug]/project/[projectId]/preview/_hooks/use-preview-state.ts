"use client";

import { useState, useCallback } from "react";
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
}

// Removed localStorage persistence - defaults should always be:
// - orientation: landscape (desktop)
// - previewMode: feed
// - compareMode: false

export function usePreviewState(): UsePreviewStateReturn {
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("feed");
  const [compareMode, setCompareMode] = useState(false);
  const [compareVideos, setCompareVideos] = useState<YouTubeVideo[]>([]);
  const [compareShorts, setCompareShorts] = useState<YouTubeVideo[]>([]);

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
  };
}
