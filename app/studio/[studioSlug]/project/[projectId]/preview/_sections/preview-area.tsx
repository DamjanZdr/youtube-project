"use client";

import { useEffect, useRef, useState } from "react";
import { FeedPreview, SuggestedPreview } from "../_components";
import type { PackagingSet, Channel, YouTubeVideo, Orientation, PreviewMode } from "../_components";

interface PreviewAreaProps {
  set: PackagingSet;
  channel: Channel;
  orientation: Orientation;
  previewMode: PreviewMode;
  compareMode: boolean;
  compareVideos: YouTubeVideo[];
  compareShorts: YouTubeVideo[];
  videoType: string;
}

export function PreviewArea({
  set,
  channel,
  orientation,
  previewMode,
  compareMode,
  compareVideos,
  compareShorts,
  videoType,
}: PreviewAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);
  
  // Calculate scale to fit container for desktop landscape view
  useEffect(() => {
    if (orientation === 'portrait') {
      setScale(1);
      return;
    }
    
    const updateScale = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      const designWidth = 1100; // Design width for desktop preview
      const newScale = (containerWidth - 32) / designWidth; // Scale to fill width
      setScale(Math.max(0.5, newScale)); // Don't scale below 50%
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [orientation]);

  // Measure content height after render
  useEffect(() => {
    if (contentRef.current && orientation !== 'portrait') {
      const observer = new ResizeObserver(() => {
        if (contentRef.current) {
          setContentHeight(contentRef.current.scrollHeight);
        }
      });
      observer.observe(contentRef.current);
      return () => observer.disconnect();
    }
  }, [orientation, previewMode]);

  const previewProps = {
    set,
    channel,
    orientation,
    compareMode,
    compareVideos,
    compareShorts,
    videoType,
  };

  if (orientation === 'portrait') {
    return (
      <div className="h-full overflow-x-auto scrollbar-hide">
        <div className="h-full flex items-center justify-center p-4">
          {previewMode === "feed" ? (
            <FeedPreview {...previewProps} />
          ) : (
            <SuggestedPreview {...previewProps} />
          )}
        </div>
      </div>
    );
  }

  // Desktop landscape: scale entire preview as a unit
  return (
    <div ref={containerRef} className="h-full overflow-y-auto overflow-x-hidden flex justify-center pt-4" style={{ scrollbarWidth: "none" }}>
      <div 
        style={{ 
          width: `${1100 * scale}px`,
          minHeight: contentHeight > 0 ? `${contentHeight * scale}px` : 'auto',
          flexShrink: 0,
        }}
      >
        <div
          ref={contentRef}
          style={{ 
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: '1100px',
          }}
        >
          {previewMode === "feed" ? (
            <FeedPreview {...previewProps} />
          ) : (
            <SuggestedPreview {...previewProps} />
          )}
        </div>
      </div>
    </div>
  );
}
