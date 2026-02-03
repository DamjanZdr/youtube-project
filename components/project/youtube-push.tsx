"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Youtube, 
  Link2, 
  Unlink, 
  Upload, 
  Loader2, 
  Check,
  ExternalLink,
  Search
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string | null;
  publishedAt: string | null;
}

interface YouTubePushProps {
  projectId: string;
  organizationId: string;
  linkedVideoId: string | null;
  lastSyncedAt: string | null;
  hasTitle: boolean;
  hasDescription: boolean;
  hasTags: boolean;
  hasThumbnail: boolean;
  onVideoLinked: (videoId: string | null) => void;
}

export function YouTubePush({
  projectId,
  organizationId,
  linkedVideoId,
  lastSyncedAt,
  hasTitle,
  hasDescription,
  hasTags,
  hasThumbnail,
  onVideoLinked,
}: YouTubePushProps) {
  const [hasConnection, setHasConnection] = useState<boolean | null>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [linking, setLinking] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Push options
  const [pushTitle, setPushTitle] = useState(true);
  const [pushDescription, setPushDescription] = useState(true);
  const [pushTags, setPushTags] = useState(true);
  const [pushThumbnail, setPushThumbnail] = useState(true);

  useEffect(() => {
    checkConnection();
  }, [organizationId]);

  const checkConnection = async () => {
    try {
      const response = await fetch(`/api/youtube/connection?organizationId=${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        setHasConnection(!!data.connection);
      } else {
        setHasConnection(false);
      }
    } catch {
      setHasConnection(false);
    }
  };

  const loadVideos = async () => {
    setLoadingVideos(true);
    try {
      const response = await fetch(`/api/youtube/videos?organizationId=${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to load videos");
      }
    } catch {
      toast.error("Failed to load videos");
    }
    setLoadingVideos(false);
  };

  const handleOpenLinkDialog = () => {
    setShowLinkDialog(true);
    loadVideos();
  };

  const handleLinkVideo = async (videoId: string) => {
    setLinking(true);
    try {
      const response = await fetch("/api/youtube/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, videoId }),
      });
      
      if (response.ok) {
        toast.success("Video linked successfully");
        onVideoLinked(videoId);
        setShowLinkDialog(false);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to link video");
      }
    } catch {
      toast.error("Failed to link video");
    }
    setLinking(false);
  };

  const handleUnlinkVideo = async () => {
    setLinking(true);
    try {
      const response = await fetch("/api/youtube/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, videoId: null }),
      });
      
      if (response.ok) {
        toast.success("Video unlinked");
        onVideoLinked(null);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to unlink video");
      }
    } catch {
      toast.error("Failed to unlink video");
    }
    setLinking(false);
  };

  const handlePush = async () => {
    if (!linkedVideoId) return;
    
    setPushing(true);
    try {
      const response = await fetch("/api/youtube/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          pushTitle,
          pushDescription,
          pushTags,
          pushThumbnail,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || "Pushed to YouTube successfully");
        setShowPushDialog(false);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to push to YouTube");
      }
    } catch {
      toast.error("Failed to push to YouTube");
    }
    setPushing(false);
  };

  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Don't show anything if no YouTube connection
  if (hasConnection === false) {
    return (
      <div className="p-4 rounded-lg border border-white/10 bg-muted/30">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Youtube className="w-5 h-5" />
          <div>
            <p className="text-sm">No YouTube channel connected</p>
            <p className="text-xs">Connect a channel in Studio Settings to push packaging to YouTube</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasConnection === null) {
    return null; // Loading
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-500" />
          <span className="font-medium">YouTube</span>
        </div>
        
        {linkedVideoId ? (
          <div className="flex items-center gap-2">
            <a 
              href={`https://www.youtube.com/watch?v=${linkedVideoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {linkedVideoId}
              <ExternalLink className="w-3 h-3" />
            </a>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleUnlinkVideo}
              disabled={linking}
            >
              <Unlink className="w-4 h-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {linkedVideoId ? (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500" />
              <span>Video linked</span>
              {lastSyncedAt && (
                <span className="text-xs text-muted-foreground">
                  • Last synced {new Date(lastSyncedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          
          <Button 
            onClick={() => setShowPushDialog(true)} 
            className="w-full gap-2"
            disabled={!hasTitle && !hasDescription && !hasTags && !hasThumbnail}
          >
            <Upload className="w-4 h-4" />
            Push to YouTube
          </Button>
        </div>
      ) : (
        <Button 
          variant="outline" 
          onClick={handleOpenLinkDialog}
          className="w-full gap-2"
        >
          <Link2 className="w-4 h-4" />
          Link YouTube Video
        </Button>
      )}

      {/* Link Video Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="glass-strong max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Link YouTube Video</DialogTitle>
            <DialogDescription>
              Select a video from your channel to link to this project
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex-1 overflow-y-auto min-h-[300px]">
            {loadingVideos ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? "No videos match your search" : "No videos found on your channel"}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredVideos.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => handleLinkVideo(video.id)}
                    disabled={linking}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left"
                  >
                    {video.thumbnail && (
                      <img 
                        src={video.thumbnail} 
                        alt={video.title}
                        className="w-32 h-18 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{video.title}</p>
                      {video.publishedAt && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(video.publishedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Push Dialog */}
      <Dialog open={showPushDialog} onOpenChange={setShowPushDialog}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle>Push to YouTube</DialogTitle>
            <DialogDescription>
              Select what to update on your YouTube video
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="push-title" 
                checked={pushTitle} 
                onCheckedChange={(c) => setPushTitle(!!c)}
                disabled={!hasTitle}
              />
              <Label htmlFor="push-title" className={!hasTitle ? "text-muted-foreground" : ""}>
                Title {!hasTitle && "(no title selected)"}
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="push-description" 
                checked={pushDescription} 
                onCheckedChange={(c) => setPushDescription(!!c)}
                disabled={!hasDescription}
              />
              <Label htmlFor="push-description" className={!hasDescription ? "text-muted-foreground" : ""}>
                Description {!hasDescription && "(no description)"}
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="push-tags" 
                checked={pushTags} 
                onCheckedChange={(c) => setPushTags(!!c)}
                disabled={!hasTags}
              />
              <Label htmlFor="push-tags" className={!hasTags ? "text-muted-foreground" : ""}>
                Tags {!hasTags && "(no tags)"}
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="push-thumbnail" 
                checked={pushThumbnail} 
                onCheckedChange={(c) => setPushThumbnail(!!c)}
                disabled={!hasThumbnail}
              />
              <Label htmlFor="push-thumbnail" className={!hasThumbnail ? "text-muted-foreground" : ""}>
                Thumbnail {!hasThumbnail && "(no thumbnail selected)"}
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPushDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePush} 
              disabled={pushing || (!pushTitle && !pushDescription && !pushTags && !pushThumbnail)}
              className="gap-2"
            >
              {pushing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Pushing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Push to YouTube
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
