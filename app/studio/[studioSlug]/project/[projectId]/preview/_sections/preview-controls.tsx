"use client";

import { Smartphone, Monitor, GitCompareArrows } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { PackagingSet, Orientation, PreviewMode } from "../_components";

interface PreviewControlsProps {
  sets: PackagingSet[];
  currentSetIndex: number;
  onSetChange: (index: number) => void;
  orientation: Orientation;
  onOrientationChange: (value: Orientation) => void;
  previewMode: PreviewMode;
  onPreviewModeChange: (value: PreviewMode) => void;
  compareMode: boolean;
  onCompareModeChange: (value: boolean) => void;
}

export function PreviewControls({
  sets,
  currentSetIndex,
  onSetChange,
  orientation,
  onOrientationChange,
  previewMode,
  onPreviewModeChange,
  compareMode,
  onCompareModeChange,
}: PreviewControlsProps) {
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3 px-3 md:px-4 py-3 border-b bg-background/50 backdrop-blur-sm shrink-0">
      {/* Left: Orientation + Mode Toggles */}
      <div className="flex items-center gap-2">
        <ToggleGroup 
          data-tutorial="device-toggle"
          type="single" 
          value={orientation} 
          onValueChange={(v) => v && onOrientationChange(v as Orientation)}
          className="bg-muted rounded-lg p-1"
        >
          <ToggleGroupItem data-tutorial="device-desktop" value="landscape" className="h-9 px-3 gap-2 data-[state=on]:bg-background text-sm">
            <Monitor className="w-4 h-4" />
            <span className="hidden sm:inline">Desktop</span>
          </ToggleGroupItem>
          <ToggleGroupItem data-tutorial="device-mobile" value="portrait" className="h-9 px-3 gap-2 data-[state=on]:bg-background text-sm">
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Mobile</span>
          </ToggleGroupItem>
        </ToggleGroup>

        <ToggleGroup 
          data-tutorial="view-toggle"
          type="single" 
          value={previewMode} 
          onValueChange={(v) => v && onPreviewModeChange(v as PreviewMode)}
          className="bg-muted rounded-lg p-1"
        >
          <ToggleGroupItem data-tutorial="view-feed" value="feed" className="h-9 px-3 text-sm data-[state=on]:bg-background">
            Feed
          </ToggleGroupItem>
          <ToggleGroupItem data-tutorial="view-suggested" value="suggested" className="h-9 px-3 text-sm data-[state=on]:bg-background">
            Suggested
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Center: Set Picker (absolutely positioned on desktop, inline on mobile) */}
      {sets.length > 1 && (
        <div className="order-last w-full sm:order-none sm:w-auto sm:absolute sm:left-1/2 sm:-translate-x-1/2 flex items-center justify-center gap-1.5 p-1 rounded-lg bg-muted overflow-x-auto max-w-[90vw] sm:max-w-[40vw]">
          {sets.map((set, index) => (
            <button
              key={set.id}
              onClick={() => onSetChange(index)}
              className={`relative rounded overflow-hidden transition-all flex flex-col items-center shrink-0 ${
                index === currentSetIndex 
                  ? "ring-2 ring-primary ring-offset-1 ring-offset-background" 
                  : "opacity-50 hover:opacity-100"
              }`}
            >
              <div className="w-10 sm:w-12 aspect-video bg-zinc-800 rounded overflow-hidden">
                {set.thumbnail_url ? (
                  <img src={set.thumbnail_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground">
                    —
                  </div>
                )}
              </div>
              <span className="text-[9px] mt-0.5 font-medium">{index + 1}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right: Compare Toggle */}
      <button
        data-tutorial="compare-toggle"
        onClick={() => onCompareModeChange(!compareMode)}
        className={`
          relative flex items-center gap-2 h-11 rounded-lg px-3 pr-14 transition-colors cursor-pointer
          ${compareMode 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted text-muted-foreground hover:text-foreground'
          }
        `}
      >
        <GitCompareArrows className="w-4 h-4" />
        <span className="text-sm font-medium">Compare</span>
        
        {/* Custom large toggle track */}
        <div 
          className={`
            absolute right-2 w-11 h-7 rounded-full transition-colors
            ${compareMode ? 'bg-primary-foreground/20' : 'bg-background/50'}
          `}
        >
          {/* Toggle thumb */}
          <div 
            className={`
              absolute top-1 w-5 h-5 rounded-full transition-all shadow-sm
              ${compareMode 
                ? 'left-[calc(100%-1.5rem)] bg-white' 
                : 'left-1 bg-muted-foreground/60'
              }
            `}
          />
        </div>
      </button>
    </div>
  );
}

// Keep this export for backwards compatibility but it's no longer needed
export function SetSelectorOverlay({
  sets,
  currentSetIndex,
  onSetChange,
}: {
  sets: PackagingSet[];
  currentSetIndex: number;
  onSetChange: (index: number) => void;
}) {
  return null;
}
