import { Search, Home, PlaySquare, Clock, User, Menu, Bell, Video } from "lucide-react";
import { YouTubeLogo } from "./youtube-logo";
import { VideoCard, ShortCard } from "./video-card";
import { PhoneMockup } from "./phone-mockup";
import type { PackagingSet, Channel, YouTubeVideo } from "./types";

interface FeedPreviewProps {
  set: PackagingSet;
  channel: Channel;
  orientation: string;
  compareMode: boolean;
  compareVideos: YouTubeVideo[];
  compareShorts: YouTubeVideo[];
  videoType: string; // 'short' or 'long'
}

export function FeedPreview({ set, channel, orientation, compareMode, compareVideos, compareShorts, videoType }: FeedPreviewProps) {
  const getLongVideo = (i: number) => compareMode && compareVideos.length ? compareVideos[Math.min(i, compareVideos.length - 1)] : null;
  const getShortVideo = (i: number) => compareMode && compareShorts.length ? compareShorts[Math.min(i, compareShorts.length - 1)] : null;
  const isShort = videoType === 'short';

  if (orientation === "portrait") {
    return (
      <div className="h-full flex items-center justify-center">
      <PhoneMockup>
        {/* YouTube Header */}
        <div className="px-3 py-2 flex items-center gap-2 border-b border-white/5 shrink-0">
          <YouTubeLogo size="sm" />
          <div className="flex-1" />
          <Search className="w-4 h-4 text-zinc-400" />
          <User className="w-4 h-4 text-zinc-400" />
        </div>

        {/* Feed Content */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3" style={{ scrollbarWidth: "none" }}>
          {/* Shorts Section - 2 side by side */}
          <div className="flex gap-2 mb-3">
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
            />
          ))}
        </div>

        {/* Bottom Nav */}
        <div className="h-10 bg-[#0f0f0f] border-t border-white/5 flex items-center justify-around shrink-0">
          <Home className="w-4 h-4 text-white" />
          <PlaySquare className="w-4 h-4 text-zinc-500" />
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center -mt-4">
            <span className="text-white text-lg">+</span>
          </div>
          <Clock className="w-4 h-4 text-zinc-500" />
          <User className="w-4 h-4 text-zinc-500" />
        </div>
      </PhoneMockup>
      </div>
    );
  }

  // Landscape Desktop
  return (
    <div 
      className="w-full bg-[#0f0f0f] flex flex-col rounded-xl overflow-hidden"
      style={{ height: 'calc(100vh - 270px)' }}
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

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Sidebar */}
        <div className="w-14 border-r border-white/5 py-2 flex flex-col items-center gap-3 shrink-0">
          <div className="flex flex-col items-center gap-0.5 text-white">
            <Home className="w-4 h-4" /><span className="text-[8px]">Home</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 text-zinc-500">
            <PlaySquare className="w-4 h-4" /><span className="text-[8px]">Shorts</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex gap-2 px-4 py-2 shrink-0">
            {["All","Gaming","Music","Live"].map((c,i) => (
              <span key={c} className={`px-3 py-1.5 rounded-lg text-xs ${i===0?"bg-white text-black":"bg-zinc-800 text-white"}`}>{c}</span>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ scrollbarWidth: "none" }}>
            {/* Long Form Videos Section */}
            <div className="grid grid-cols-3 gap-x-4 gap-y-6 mb-8">
              {[0,1,2].map(i => (
                <VideoCard
                  key={`long-${i}`}
                  isYours={!isShort && i === 1}
                  set={set}
                  channel={channel}
                  compareVideo={getLongVideo(i)}
                  size="md"
                />
              ))}
            </div>

            {/* Shorts Section */}
            <div className="mb-4">
              <h3 className="text-white text-lg font-semibold mb-3">Shorts</h3>
              <div className="grid grid-cols-5 gap-x-4">
                {[0,1,2,3,4].map(i => (
                  <ShortCard
                    key={`short-${i}`}
                    isYours={isShort && i === 2}
                    set={set}
                    compareVideo={getShortVideo(i)}
                    size="md"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
