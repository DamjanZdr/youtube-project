import { Search, Menu, Bell, Video } from "lucide-react";
import { YouTubeLogo } from "./youtube-logo";
import { VideoCard, ShortCard } from "./video-card";
import { PhoneMockup } from "./phone-mockup";
import type { PackagingSet, Channel, YouTubeVideo } from "./types";

interface SuggestedPreviewProps {
  set: PackagingSet;
  channel: Channel;
  orientation: string;
  compareMode: boolean;
  compareVideos: YouTubeVideo[];
  compareShorts: YouTubeVideo[];
  videoType: string; // 'short' or 'long'
}

function VideoPlayer({ size = "lg" }: { size?: "sm" | "lg" }) {
  const playBtnSize = size === "sm" ? "w-10 h-10" : "w-14 h-14";
  const borderSize = size === "sm" ? "border-l-[12px] border-y-[8px]" : "border-l-[16px] border-y-[10px]";
  
  return (
    <div className={`${size === "lg" ? "w-full" : ""} aspect-video bg-black relative shrink-0 rounded-xl`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`${playBtnSize} rounded-full bg-white/10 flex items-center justify-center`}>
          <div className={`w-0 h-0 ${borderSize} border-l-white border-y-transparent ml-1`} />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-700">
        <div className="h-full w-1/3 bg-red-600" />
      </div>
    </div>
  );
}

export function SuggestedPreview({ set, channel, orientation, compareMode, compareVideos, compareShorts, videoType }: SuggestedPreviewProps) {
  const getLongVideo = (i: number) => compareMode && compareVideos.length ? compareVideos[Math.min(i, compareVideos.length - 1)] : null;
  const getShortVideo = (i: number) => compareMode && compareShorts.length ? compareShorts[Math.min(i, compareShorts.length - 1)] : null;
  const isShort = videoType === 'short';

  if (orientation === "portrait") {
    return (
      <div className="h-full flex items-center justify-center">
      <PhoneMockup>
        {/* Video Player */}
        <VideoPlayer size="sm" />

        {/* Currently Watching Info */}
        <div className="p-2 border-b border-white/5 shrink-0">
          <h4 className="text-[10px] font-medium text-white">Currently watching...</h4>
          <p className="text-[9px] text-zinc-400">Some Channel  5.2M views</p>
        </div>

        {/* Suggested Videos */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ scrollbarWidth: "none" }}>
          {/* Shorts Section - 2 side by side */}
          <div className="flex gap-2 mb-2">
            {[0,1].map(i => (
              <ShortCard
                key={`short-${i}`}
                isYours={isShort && i === 1}
                set={set}
                compareVideo={getShortVideo(i)}
                size="sm"
              />
            ))}
          </div>

          {/* Long Form Videos */}
          {[0,1,2,3].map(i => (
            <VideoCard
              key={`long-${i}`}
              isYours={!isShort && i === 1}
              set={set}
              channel={channel}
              compareVideo={getLongVideo(i)}
              size="sm"
              layout="horizontal"
            />
          ))}
        </div>
      </PhoneMockup>
      </div>
    );
  }

  // Landscape Desktop Watch Page
  return (
    <div 
      className="w-full bg-[#0f0f0f] flex flex-col rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="h-7 border-b border-white/5 flex items-center px-2 gap-2 shrink-0">
        <Menu className="w-3 h-3 text-white" />
        <YouTubeLogo size="xs" />
        <div className="flex-1 max-w-[200px] mx-auto flex">
          <div className="flex-1 h-4 bg-zinc-900 border border-zinc-700 rounded-l-full px-2 flex items-center">
            <span className="text-[6px] text-zinc-500">Search</span>
          </div>
          <div className="h-4 w-6 bg-zinc-800 border border-zinc-700 border-l-0 rounded-r-full flex items-center justify-center">
            <Search className="w-2 h-2 text-white" />
          </div>
        </div>
        <Video className="w-2.5 h-2.5 text-white" />
        <Bell className="w-2.5 h-2.5 text-white" />
        <div className="w-4 h-4 rounded-full bg-purple-600" />
      </div>

      {/* Watch Page Content */}
      <div className="flex gap-2 p-2">
        {/* Main Video - 70% width */}
        <div className="flex flex-col min-w-0" style={{ flex: '0 0 70%' }}>
          <div 
            className="w-full bg-black rounded-lg flex items-center justify-center shrink-0"
            style={{ aspectRatio: '16/9' }}
          >
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
              <div className="w-0 h-0 border-l-[10px] border-y-[6px] border-l-white border-y-transparent ml-0.5" />
            </div>
          </div>
          {/* Video info placeholder */}
          <div className="mt-2 space-y-1">
            <div className="h-3 bg-white/10 rounded w-3/4" />
            <div className="h-2 bg-white/5 rounded w-1/2" />
          </div>
        </div>

        {/* Suggested Sidebar - 30% width */}
        <div className="space-y-1.5" style={{ flex: '0 0 calc(30% - 8px)' }}>
          {/* Shorts Section (3 shorts) */}
          <div className="mb-1">
            <h4 className="text-white text-[7px] font-semibold mb-0.5">Shorts</h4>
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <ShortCard
                  key={`short-${i}`}
                  isYours={isShort && i === 1}
                  set={set}
                  compareVideo={getShortVideo(i)}
                  size="sm"
                />
              ))}
            </div>
          </div>

          {/* Long Form Videos */}
          <div className="space-y-1.5">
            {[0,1,2,3,4].map(i => (
              <VideoCard
                key={`long-${i}`}
                isYours={!isShort && i === 1}
                set={set}
                channel={channel}
                compareVideo={getLongVideo(i)}
                size="sm"
                layout="horizontal"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
