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

      <div className="flex">
        {/* Sidebar */}
        <div className="w-9 border-r border-white/5 py-1 flex flex-col items-center gap-2 shrink-0">
          <div className="flex flex-col items-center gap-0 text-white">
            <Home className="w-2.5 h-2.5" /><span className="text-[5px]">Home</span>
          </div>
          <div className="flex flex-col items-center gap-0 text-zinc-500">
            <PlaySquare className="w-2.5 h-2.5" /><span className="text-[5px]">Shorts</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex gap-1 px-2 py-1 shrink-0">
            {["All","Gaming","Music","Live"].map((c,i) => (
              <span key={c} className={`px-1.5 py-0.5 rounded text-[7px] ${i===0?"bg-white text-black":"bg-zinc-800 text-white"}`}>{c}</span>
            ))}
          </div>
          <div className="px-2 pb-2">
            {/* Long Form Videos Section */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-2 gap-y-3 mb-4">
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
            <div className="mb-2">
              <h3 className="text-white text-[9px] font-semibold mb-1">Shorts</h3>
              <div className="grid grid-cols-3 lg:grid-cols-5 gap-x-2">
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
