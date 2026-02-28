"use client";

import { Smartphone, Monitor } from "lucide-react";
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

      {/* Center: Compare Toggle (absolutely positioned on desktop) */}
      <div 
        data-tutorial="compare-toggle"
        onClick={() => onCompareModeChange(!compareMode)}
        className="order-last w-full sm:order-none sm:w-auto sm:absolute sm:left-1/2 sm:-translate-x-1/2 flex items-center justify-center sm:justify-start"
      >
        <div 
          className="relative h-11 bg-muted rounded-lg cursor-pointer px-1.5 flex items-center"
          style={{ boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)' }}
        >
          {/* Off button */}
          <div className="relative h-9 flex items-center">
            <div 
              className={`h-9 px-3 rounded-l-md flex items-center justify-center transition-all duration-150 ${
                !compareMode ? 'bg-zinc-700 text-muted-foreground' : 'bg-zinc-500 text-foreground'
              }`}
              style={compareMode ? { transform: 'translateY(-2px)' } : {}}
            >
              <span className="text-sm">Off</span>
            </div>
            {/* Right edge visible when Off is raised */}
            {compareMode && (
              <div 
                className="absolute right-0 top-0 w-1 h-9 bg-zinc-700 rounded-r-sm"
                style={{ 
                  transform: 'translateX(100%) translateY(-2px)',
                  boxShadow: '2px 2px 3px rgba(0,0,0,0.4)'
                }}
              />
            )}
          </div>
          
          {/* On button */}
          <div className="relative h-9 flex items-center">
            {/* Left edge visible when On is raised */}
            {!compareMode && (
              <div 
                className="absolute left-0 top-0 w-1 h-9 bg-zinc-700 rounded-l-sm"
                style={{ 
                  transform: 'translateX(-100%) translateY(-2px)',
                  boxShadow: '-2px 2px 3px rgba(0,0,0,0.4)'
                }}
              />
            )}
            <div 
              className={`h-9 px-3 rounded-r-md flex items-center justify-center transition-all duration-150 ${
                compareMode ? 'bg-zinc-700 text-muted-foreground' : 'bg-zinc-500 text-foreground'
              }`}
              style={!compareMode ? { transform: 'translateY(-2px)' } : {}}
            >
              <span className="text-sm">On</span>
            </div>
          </div>
        </div>
        <span className="ml-2 text-xs text-muted-foreground hidden sm:inline">Compare</span>
      </div>

      {/* Right: Set Picker */}
      {sets.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 p-1 rounded-lg bg-muted overflow-x-auto max-w-[40vw]">
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
