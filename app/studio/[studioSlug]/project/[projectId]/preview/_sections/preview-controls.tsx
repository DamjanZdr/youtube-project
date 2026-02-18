"use client";

import { Smartphone, Monitor, GitCompareArrows } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
      {/* Left: Orientation Toggle */}
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

      {/* Center: Set Picker (absolutely positioned on desktop, inline on mobile) */}
      {sets.length > 1 && (
        <div className="order-last w-full sm:order-none sm:w-auto sm:absolute sm:left-1/2 sm:-translate-x-1/2 flex items-center justify-center gap-2 p-1.5 rounded-lg bg-muted">
          {sets.map((set, index) => (
            <button
              key={set.id}
              onClick={() => onSetChange(index)}
              className={`relative rounded-lg overflow-hidden transition-all flex flex-col items-center ${
                index === currentSetIndex 
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
                  : "opacity-50 hover:opacity-100"
              }`}
            >
              <div className="w-16 sm:w-20 aspect-video bg-zinc-800 rounded-md overflow-hidden">
                {set.thumbnail_url ? (
                  <img src={set.thumbnail_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                    No thumb
                  </div>
                )}
              </div>
              <span className="text-[10px] mt-1 font-medium">Set {index + 1}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right: Mode Toggle + Compare */}
      <div className="flex items-center gap-3">
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

        <div className="flex items-center gap-2 pl-3 border-l">
          <GitCompareArrows className="w-4 h-4 text-muted-foreground hidden sm:block" />
          <Switch
            data-tutorial="compare-toggle"
            id="compare-mode"
            checked={compareMode}
            onCheckedChange={onCompareModeChange}
          />
          <Label htmlFor="compare-mode" className="text-sm">
            Compare
          </Label>
        </div>
      </div>
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
