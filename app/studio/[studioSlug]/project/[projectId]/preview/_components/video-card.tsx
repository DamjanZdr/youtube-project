import { formatRelativeTime } from "./utils";
import type { PackagingSet, Channel, YouTubeVideo } from "./types";

interface VideoCardProps {
  isYours: boolean;
  set?: PackagingSet;
  channel?: Channel;
  compareVideo?: YouTubeVideo | null;
  size?: "sm" | "md" | "lg";
  layout?: "vertical" | "horizontal";
}

interface ShortCardProps {
  isYours: boolean;
  set?: PackagingSet;
  compareVideo?: YouTubeVideo | null;
  size?: "sm" | "md";
}

export function VideoCard({ 
  isYours, 
  set, 
  channel, 
  compareVideo, 
  size = "md",
  layout = "vertical" 
}: VideoCardProps) {
  const thumbnail = isYours ? set?.thumbnail_url : compareVideo?.thumbnail;
  const title = isYours ? (set?.title || "Your Video") : (compareVideo?.title || "Other Video");
  const channelName = isYours ? channel?.name : (compareVideo?.channelTitle || "Channel");
  const channelAvatar = isYours ? channel?.avatar_url : (compareVideo?.channelThumbnail || null);
  const viewInfo = isYours ? "1 day ago" : (compareVideo ? formatRelativeTime(compareVideo.publishedAt) : "500K views");

  const sizeClasses = {
    sm: { avatar: "w-8 h-8", title: "text-sm", meta: "text-xs", duration: "text-[10px]", thumb: "w-40", gap: "gap-2" },
    md: { avatar: "w-9 h-9", title: "text-sm font-medium", meta: "text-xs", duration: "text-xs", thumb: "w-44", gap: "gap-3" },
    lg: { avatar: "w-10 h-10", title: "text-base", meta: "text-sm", duration: "text-xs", thumb: "w-56", gap: "gap-3" },
  };
  const s = sizeClasses[size];

  if (layout === "horizontal") {
    return (
      <div className={`flex ${s.gap} ${!isYours && !compareVideo ? "opacity-40" : ""}`}>
        <div className={`${s.thumb} aspect-video rounded-lg bg-zinc-800 shrink-0 overflow-hidden relative`}>
          {thumbnail && <img src={thumbnail} className="w-full h-full object-cover" alt="" />}
          <span className={`absolute bottom-1 right-1 ${s.duration} bg-black/80 px-1 rounded`}>12:34</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`${s.title} font-medium line-clamp-2 text-white leading-tight`}>{title}</h4>
          <div className="flex items-center gap-2 mt-1">
            <div className={`${s.avatar} rounded-full bg-zinc-700 shrink-0 overflow-hidden`}>
              {channelAvatar && <img src={channelAvatar} className="w-full h-full object-cover" alt="" />}
            </div>
            <p className={`${s.meta} text-zinc-400`}>{channelName}</p>
          </div>
          <p className={`${s.meta} text-zinc-400`}>{viewInfo}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={!isYours && !compareVideo ? "opacity-40" : ""}>
      <div className="aspect-video rounded-xl bg-zinc-800 mb-3 overflow-hidden relative">
        {thumbnail && <img src={thumbnail} className="w-full h-full object-cover" alt="" />}
        <span className={`absolute bottom-2 right-2 ${s.duration} bg-black/80 px-1.5 py-0.5 rounded font-medium`}>12:34</span>
      </div>
      <div className={`flex ${s.gap}`}>
        <div className={`${s.avatar} rounded-full bg-zinc-700 shrink-0 mt-0.5 overflow-hidden`}>
          {channelAvatar && <img src={channelAvatar} className="w-full h-full object-cover" alt="" />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`${s.title} font-medium line-clamp-2 text-white leading-tight`}>{title}</h4>
          <p className={`${s.meta} text-zinc-400 mt-1`}>{channelName}</p>
          <p className={`${s.meta} text-zinc-400`}>{viewInfo}</p>
        </div>
      </div>
    </div>
  );
}
export function ShortCard({ isYours, set, compareVideo, size = "md" }: ShortCardProps) {
  const thumbnail = isYours ? set?.thumbnail_url : compareVideo?.thumbnail;
  const title = isYours ? (set?.title || "Your Short") : (compareVideo?.title || "Short Video");
  const viewInfo = isYours ? "1.2M views" : (compareVideo ? "500K views" : "500K views");

  const sizeClasses = {
    sm: { width: "w-32", title: "text-[10px]", views: "text-[9px]" },
    md: { width: "w-full", title: "text-xs", views: "text-[10px]" },
  };
  const s = sizeClasses[size];

  return (
    <div className={`${s.width} ${!isYours && !compareVideo ? "opacity-40" : ""}`}>
      <div className="aspect-[9/16] rounded-xl bg-zinc-800 overflow-hidden relative mb-2">
        {thumbnail && <img src={thumbnail} className="w-full h-full object-cover" alt="" />}
      </div>
      <h4 className={`${s.title} font-medium line-clamp-2 text-white leading-tight`}>{title}</h4>
      <p className={`${s.views} text-zinc-400 mt-0.5`}>{viewInfo}</p>
    </div>
  );
}