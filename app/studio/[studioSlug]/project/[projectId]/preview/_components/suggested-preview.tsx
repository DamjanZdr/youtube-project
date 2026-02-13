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
      style={{ height: 'calc(100vh - 260px)', minHeight: '400px' }}
    >
      {/* Header */}
      <div className="h-11 border-b border-white/5 flex items-center px-4 gap-4 shrink-0">
        <Menu className="w-5 h-5 text-white" />
        <YouTubeLogo />
        <div className="flex-1 max-w-md mx-auto flex">
          <div className="flex-1 h-7 bg-zinc-900 border border-zinc-700 rounded-l-full px-3 flex items-center">
            <span className="text-[10px] text-zinc-500">Search</span>
          </div>
          <div className="h-7 w-10 bg-zinc-800 border border-zinc-700 border-l-0 rounded-r-full flex items-center justify-center">
            <Search className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
        <Video className="w-4 h-4 text-white" />
        <Bell className="w-4 h-4 text-white" />
        <div className="w-6 h-6 rounded-full bg-purple-600" />
      </div>

      {/* Watch Page Content */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden min-h-0">
        {/* Main Video - 70% width */}
        <div className="flex flex-col min-w-0" style={{ flex: '0 0 70%' }}>
          <div 
            className="w-full bg-black rounded-xl flex items-center justify-center shrink-0"
            style={{ aspectRatio: '16/9' }}
          >
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
              <div className="w-0 h-0 border-l-[16px] border-y-[10px] border-l-white border-y-transparent ml-1" />
            </div>
          </div>
          {/* Video info placeholder */}
          <div className="mt-3 space-y-2">
            <div className="h-5 bg-white/10 rounded w-3/4" />
            <div className="h-4 bg-white/5 rounded w-1/2" />
          </div>
        </div>

        {/* Suggested Sidebar - 30% width */}
        <div className="overflow-y-auto space-y-3" style={{ flex: '0 0 calc(30% - 16px)', scrollbarWidth: "none" }}>
          {/* Shorts Section (3 shorts) - constrained height */}
          <div className="mb-3 shrink-0">
            <h4 className="text-white text-xs font-semibold mb-2">Shorts</h4>
            <div className="flex gap-1 overflow-hidden" style={{ height: '160px' }}>
              {[0,1,2].map(i => (
                <div key={`short-${i}`} className="w-[70px] shrink-0">
                  <ShortCard
                    isYours={isShort && i === 1}
                    set={set}
                    compareVideo={getShortVideo(i)}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Long Form Videos */}
          <div className="space-y-2">
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
