import { formatRelativeTime, formatViewCount } from "./utils";
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
  const viewInfo = isYours ? "1 day ago" : (compareVideo ? `${formatViewCount()} • ${formatRelativeTime(compareVideo.publishedAt)}` : "500K views • 2 days ago");

  const sizeClasses = {
    sm: { avatar: "w-5 h-5", title: "text-[9px]", meta: "text-[7px]", duration: "text-[6px]", thumb: "w-24", gap: "gap-1" },
    md: { avatar: "w-5 h-5", title: "text-[10px] font-medium", meta: "text-[8px]", duration: "text-[7px]", thumb: "w-28", gap: "gap-1.5" },
    lg: { avatar: "w-6 h-6", title: "text-xs", meta: "text-[9px]", duration: "text-[8px]", thumb: "w-36", gap: "gap-2" },
  };
  const s = sizeClasses[size];

  if (layout === "horizontal") {
    return (
      <div className={`flex gap-1.5 ${!isYours && !compareVideo ? "opacity-40" : ""}`}>
        <div className="w-[50%] aspect-video rounded-md bg-zinc-800 shrink-0 overflow-hidden relative">
          {thumbnail && <img src={thumbnail} className="w-full h-full object-cover" alt="" />}
          <span className={`absolute bottom-0.5 right-0.5 ${s.duration} bg-black/80 px-0.5 rounded`}>12:34</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`${s.title} font-medium line-clamp-2 text-white leading-tight`}>{title}</h4>
          <p className={`${s.meta} text-zinc-400 mt-0.5`}>{channelName}</p>
          <p className={`${s.meta} text-zinc-400`}>{viewInfo}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={!isYours && !compareVideo ? "opacity-40" : ""}>
      <div className="aspect-video rounded-lg bg-zinc-800 mb-1.5 overflow-hidden relative">
        {thumbnail && <img src={thumbnail} className="w-full h-full object-cover" alt="" />}
        <span className={`absolute bottom-1 right-1 ${s.duration} bg-black/80 px-1 py-0.5 rounded font-medium`}>12:34</span>
      </div>
      <div className={`flex ${s.gap}`}>
        <div className={`${s.avatar} rounded-full bg-zinc-700 shrink-0 mt-0.5 overflow-hidden`}>
          {channelAvatar && <img src={channelAvatar} className="w-full h-full object-cover" alt="" />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`${s.title} font-medium line-clamp-2 text-white leading-tight`}>{title}</h4>
          <p className={`${s.meta} text-zinc-400 mt-0.5`}>{channelName}</p>
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
    sm: { width: "flex-1 min-w-0", title: "text-[7px]", views: "text-[6px]" },
    md: { width: "w-full", title: "text-[8px]", views: "text-[7px]" },
  };
  const s = sizeClasses[size];

  return (
    <div className={`${s.width} ${!isYours && !compareVideo ? "opacity-40" : ""}`}>
      <div className="aspect-[9/16] rounded-lg bg-zinc-800 overflow-hidden relative mb-1">
        {thumbnail && <img src={thumbnail} className="w-full h-full object-cover" alt="" />}
      </div>
      <h4 className={`${s.title} font-medium line-clamp-2 text-white leading-tight`}>{title}</h4>
      <p className={`${s.views} text-zinc-400 mt-0.5`}>{viewInfo}</p>
    </div>
  );
}