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
          className="relative h-14 bg-muted rounded-lg cursor-pointer px-2 flex items-center gap-0 overflow-visible"
          style={{ boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)' }}
        >
          {/* Off button */}
          <div 
            className={`relative w-10 flex items-center justify-center transition-all duration-150 ${
              compareMode ? 'bg-zinc-500' : 'bg-zinc-600'
            }`}
            style={compareMode ? {
              height: '40px',
              clipPath: 'polygon(0 -15%, 100% 0, 100% 100%, 0 115%)',
              borderRadius: '4px 0 0 4px',
              marginTop: '-4px'
            } : {
              height: '32px',
              clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
              borderRadius: '4px 0 0 4px'
            }}
          >
            <span 
              className={`text-sm ${compareMode ? 'text-foreground' : 'text-muted-foreground'}`}
              style={compareMode ? { transform: 'skewY(-5deg)' } : {}}
            >
              Off
            </span>
          </div>
          {/* Left depth edge when Off is raised */}
          {compareMode && (
            <div 
              className="absolute bg-zinc-400"
              style={{
                left: '4px',
                top: '50%',
                width: '4px',
                height: '44px',
                transform: 'translateX(-100%) translateY(-50%) skewY(5deg)',
                borderRadius: '2px 0 0 2px',
                boxShadow: '-1px 0 2px rgba(0,0,0,0.4)'
              }}
            />
          )}
          
          {/* On button */}
          <div 
            className={`relative w-10 flex items-center justify-center transition-all duration-150 ${
              !compareMode ? 'bg-zinc-500' : 'bg-zinc-600'
            }`}
            style={!compareMode ? {
              height: '40px',
              clipPath: 'polygon(0 0, 100% -15%, 100% 115%, 0 100%)',
              borderRadius: '0 4px 4px 0',
              marginTop: '-4px'
            } : {
              height: '32px',
              clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
              borderRadius: '0 4px 4px 0'
            }}
          >
            <span 
              className={`text-sm ${!compareMode ? 'text-foreground' : 'text-muted-foreground'}`}
              style={!compareMode ? { transform: 'skewY(5deg)' } : {}}
            >
              On
            </span>
          </div>
          {/* Right depth edge when On is raised */}
          {!compareMode && (
            <div 
              className="absolute bg-zinc-400"
              style={{
                right: '4px',
                top: '50%',
                width: '4px',
                height: '44px',
                transform: 'translateX(100%) translateY(-50%) skewY(-5deg)',
                borderRadius: '0 2px 2px 0',
                boxShadow: '1px 0 2px rgba(0,0,0,0.4)'
              }}
            />
          )}
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
