"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Youtube, Link2, Unlink, ExternalLink, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface YouTubeConnection {
  id: string;
  channel_id: string;
  channel_title: string;
  channel_thumbnail: string | null;
  connected_by: string;
  created_at: string;
}

interface YouTubeTabProps {
  studioId: string;
  studioSlug: string;
  isOwner: boolean;
}

export function YouTubeTab({ studioId, studioSlug, isOwner }: YouTubeTabProps) {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connection, setConnection] = useState<YouTubeConnection | null>(null);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  useEffect(() => {
    loadConnection();
  }, [studioId]);

  const loadConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/youtube/connection?organizationId=${studioId}`);
      if (response.ok) {
        const data = await response.json();
        setConnection(data.connection);
      } else if (response.status !== 404) {
        console.error("Failed to load YouTube connection");
      }
    } catch (error) {
      console.error("Error loading YouTube connection:", error);
    }
    setLoading(false);
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await fetch("/api/youtube/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: studioId, studioSlug }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to start connection");
      }
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      toast.error("Failed to connect YouTube channel");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const response = await fetch("/api/youtube/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: studioId }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }
      
      setConnection(null);
      setShowDisconnectDialog(false);
      toast.success("YouTube channel disconnected");
    } catch (error) {
      toast.error("Failed to disconnect YouTube channel");
    }
    setDisconnecting(false);
  };

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading YouTube connection...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Youtube className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">YouTube Channel</h3>
            <p className="text-sm text-muted-foreground">
              Connect your YouTube channel to push packaging data directly to your videos
            </p>
          </div>
        </div>

        {connection ? (
          <div className="space-y-4">
            {/* Connected Channel Info */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              {connection.channel_thumbnail && (
                <img 
                  src={connection.channel_thumbnail} 
                  alt={connection.channel_title}
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div className="flex-1">
                <div className="font-medium">{connection.channel_title}</div>
                <div className="text-sm text-muted-foreground">
                  Connected • Channel ID: {connection.channel_id}
                </div>
              </div>
              <a 
                href={`https://www.youtube.com/channel/${connection.channel_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* What You Can Do */}
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">What you can do with this connection:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Push title, description, and tags from your project packaging</li>
                <li>Upload thumbnails directly to your YouTube videos</li>
                <li>Link projects to specific videos for easy management</li>
              </ul>
            </div>

            {/* Disconnect Button */}
            {isOwner && (
              <div className="pt-4 border-t border-white/10">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDisconnectDialog(true)}
                  className="text-red-400 hover:text-red-300 hover:border-red-400/50"
                >
                  <Unlink className="w-4 h-4 mr-2" />
                  Disconnect Channel
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-white/10">
              <p className="text-sm text-muted-foreground mb-3">
                No YouTube channel connected. Connect your channel to enable:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Pushing video titles and descriptions</li>
                <li>Uploading thumbnails directly</li>
                <li>Syncing tags to your videos</li>
              </ul>
            </div>

            {isOwner ? (
              <Button 
                onClick={handleConnect} 
                disabled={connecting}
                className="gap-2"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    Connect YouTube Channel
                  </>
                )}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Only the studio owner can connect a YouTube channel.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle>Disconnect YouTube Channel?</DialogTitle>
            <DialogDescription>
              This will remove the connection to {connection?.channel_title}. 
              Any linked videos in your projects will be unlinked. 
              You can reconnect the channel at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisconnectDialog(false)} disabled={disconnecting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                "Disconnect"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
