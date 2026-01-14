export interface PackagingSet {
  id: string;
  title: string;
  thumbnail_url: string | null;
  is_selected: boolean;
  position: number;
}

export interface Channel {
  name: string;
  avatar_url: string | null;
  handle: string | null;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  publishedAt: string;
}

export type Orientation = "landscape" | "portrait";
export type PreviewMode = "feed" | "suggested";
