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
    <div className="relative flex flex-wrap items-center justify-between gap-2 px-3 md:px-4 py-2 border-b bg-background/50 backdrop-blur-sm shrink-0">
      {/* Left: Orientation Toggle */}
      <ToggleGroup 
        type="single" 
        value={orientation} 
        onValueChange={(v) => v && onOrientationChange(v as Orientation)}
        className="bg-muted rounded-lg p-0.5 md:p-1"
      >
        <ToggleGroupItem value="landscape" className="h-7 md:h-8 px-2 md:px-3 gap-1.5 md:gap-2 data-[state=on]:bg-background">
          <Monitor className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="hidden sm:inline text-xs md:text-sm">Desktop</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="portrait" className="h-7 md:h-8 px-2 md:px-3 gap-1.5 md:gap-2 data-[state=on]:bg-background">
          <Smartphone className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="hidden sm:inline text-xs md:text-sm">Mobile</span>
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Center: Set Picker (absolutely positioned on desktop, inline on mobile) */}
      {sets.length > 1 && (
        <div className="order-last w-full sm:order-none sm:w-auto sm:absolute sm:left-1/2 sm:-translate-x-1/2 flex items-center justify-center gap-1.5 p-1 rounded-lg bg-muted">
          {sets.map((set, index) => (
            <button
              key={set.id}
              onClick={() => onSetChange(index)}
              className={`relative rounded-md overflow-hidden transition-all ${
                index === currentSetIndex 
                  ? "ring-2 ring-primary ring-offset-1 ring-offset-background" 
                  : "opacity-50 hover:opacity-100"
              }`}
            >
              <div className="w-10 sm:w-12 aspect-video bg-zinc-800">
                {set.thumbnail_url && (
                  <img src={set.thumbnail_url} className="w-full h-full object-cover" alt="" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Right: Mode Toggle + Compare */}
      <div className="flex items-center gap-2 md:gap-3">
        <ToggleGroup 
          type="single" 
          value={previewMode} 
          onValueChange={(v) => v && onPreviewModeChange(v as PreviewMode)}
          className="bg-muted rounded-lg p-0.5 md:p-1"
        >
          <ToggleGroupItem value="feed" className="h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm data-[state=on]:bg-background">
            Feed
          </ToggleGroupItem>
          <ToggleGroupItem value="suggested" className="h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm data-[state=on]:bg-background">
            Suggested
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="flex items-center gap-1.5 md:gap-2 pl-2 md:pl-3 border-l">
          <GitCompareArrows className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground hidden sm:block" />
          <Switch
            id="compare-mode"
            checked={compareMode}
            onCheckedChange={onCompareModeChange}
          />
          <Label htmlFor="compare-mode" className="text-xs md:text-sm">
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
