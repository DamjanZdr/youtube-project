"use client";

import { FeedPreview, SuggestedPreview } from "../_components";
import type { PackagingSet, Channel, YouTubeVideo, Orientation, PreviewMode } from "../_components";

interface PreviewAreaProps {
  set: PackagingSet;
  channel: Channel;
  orientation: Orientation;
  previewMode: PreviewMode;
  compareMode: boolean;
  compareVideos: YouTubeVideo[];
}

export function PreviewArea({
  set,
  channel,
  orientation,
  previewMode,
  compareMode,
  compareVideos,
}: PreviewAreaProps) {
  const previewProps = {
    set,
    channel,
    orientation,
    compareMode,
    compareVideos,
  };

  return (
    <div className="h-full flex items-center justify-center p-4 overflow-hidden">
      {previewMode === "feed" ? (
        <FeedPreview {...previewProps} />
      ) : (
        <SuggestedPreview {...previewProps} />
      )}
    </div>
  );
}
