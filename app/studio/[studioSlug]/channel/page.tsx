"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Monitor,
  Smartphone,
  Tv,
  Globe,
  Twitter,
  Instagram,
  Image,
  User,
  Type,
  AtSign,
  FileText,
  Link2,
  Upload,
  Download,
  Trash2,
  Plus,
  X,
  GripVertical
} from "lucide-react";

type ViewMode = "landscape" | "portrait" | "tv";
type EditDialog = "banner" | "icon" | "name" | "handle" | "description" | "links" | "subs" | "videos" | null;

interface ChannelLink {
  id: string;
  icon: typeof Twitter;
  label: string;
  url: string;
}

interface DBChannel {
  id: string;
  organization_id: string;
  name: string;
  handle: string | null;
  description: string | null;
  avatar_url: string | null;
  banner_url: string | null;
}

interface DBChannelLink {
  id: string;
  channel_id: string;
  title: string;
  url: string;
  position: number;
}

export default function ChannelPage() {
  const params = useParams();
  const studioSlug = params.studioSlug as string;
  
  const [viewMode, setViewMode] = useState<ViewMode>("landscape");
  const [editDialog, setEditDialog] = useState<EditDialog>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channelId, setChannelId] = useState<string | null>(null);
  
  // Channel data state
  const [channel, setChannel] = useState({
    banner: null as string | null,
    icon: null as string | null,
    name: "Creator Name",
    handle: "@creatorhandle",
    subs: "0 subscribers",
    videos: "0 videos",
    description: "Welcome to my channel!",
    links: [] as ChannelLink[]
  });

  // Preview controls
  const [subCount, setSubCount] = useState(0);
  const [videoCount, setVideoCount] = useState(0);

  // Update display when counts change
  useEffect(() => {
    setChannel(prev => ({
      ...prev,
      subs: formatCount(subCount) + " subscriber" + (subCount !== 1 ? "s" : ""),
      videos: formatCount(videoCount) + " video" + (videoCount !== 1 ? "s" : "")
    }));
  }, [subCount, videoCount]);

  const formatCount = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toString();
  };

  const supabase = createClient();

  useEffect(() => {
    loadChannelData();
  }, [studioSlug]);

  const loadChannelData = async () => {
    setLoading(true);

    // Get organization from slug
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", studioSlug)
      .single();

    if (!org) {
      setLoading(false);
      return;
    }

    // Get or create channel
    let { data: channelData } = await supabase
      .from("channels")
      .select("*")
      .eq("organization_id", org.id)
      .single();

    // If no channel exists, create one
    if (!channelData) {
      const { data: newChannel } = await supabase
        .from("channels")
        .insert({ 
          organization_id: org.id, 
          name: "My Channel",
          handle: "@mychannel"
        })
        .select()
        .single();
      channelData = newChannel;
    }

    if (channelData) {
      setChannelId(channelData.id);

      // Load channel links
      const { data: linksData } = await supabase
        .from("channel_links")
        .select("*")
        .eq("channel_id", channelData.id)
        .order("position");

      const mappedLinks: ChannelLink[] = (linksData || []).map(link => ({
        id: link.id,
        icon: Globe, // Default icon, could be improved with icon mapping
        label: link.title,
        url: link.url,
      }));

      setChannel({
        banner: channelData.banner_url,
        icon: channelData.avatar_url,
        name: channelData.name,
        handle: channelData.handle || "@channel",
        subs: "0 subscribers", // From YouTube API eventually
        videos: "0 videos", // From YouTube API eventually
        description: channelData.description || "",
        links: mappedLinks,
      });
    }

    setLoading(false);
  };

  const saveChannelField = async (field: keyof DBChannel, value: string | null) => {
    if (!channelId) return;

    await supabase
      .from("channels")
      .update({ [field]: value })
      .eq("id", channelId);
  };

  // Temporary edit states
  const [tempName, setTempName] = useState(channel.name);
  const [tempHandle, setTempHandle] = useState(channel.handle);
  const [tempDescription, setTempDescription] = useState(channel.description);
  const [tempLinks, setTempLinks] = useState(channel.links);
  const [tempSubCount, setTempSubCount] = useState("");
  const [tempVideoCount, setTempVideoCount] = useState("");

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  // File upload handlers
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && channelId) {
      // TODO: Upload to Supabase storage
      const url = URL.createObjectURL(file);
      setChannel(prev => ({ ...prev, banner: url }));
      await saveChannelField("banner_url", url);
      setEditDialog(null);
    }
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && channelId) {
      // TODO: Upload to Supabase storage
      const url = URL.createObjectURL(file);
      setChannel(prev => ({ ...prev, icon: url }));
      await saveChannelField("avatar_url", url);
      setEditDialog(null);
    }
  };

  // Save handlers
  const saveName = async () => {
    setChannel(prev => ({ ...prev, name: tempName }));
    await saveChannelField("name", tempName);
    setEditDialog(null);
  };

  const saveHandle = async () => {
    setChannel(prev => ({ ...prev, handle: tempHandle }));
    await saveChannelField("handle", tempHandle);
    setEditDialog(null);
  };

  const saveDescription = async () => {
    setChannel(prev => ({ ...prev, description: tempDescription }));
    await saveChannelField("description", tempDescription);
    setEditDialog(null);
  };

  const saveLinks = async () => {
    if (!channelId) return;

    setSaving(true);

    // Delete all existing links
    await supabase.from("channel_links").delete().eq("channel_id", channelId);

    // Insert new links
    const linksToInsert = tempLinks.map((link, index) => ({
      channel_id: channelId,
      title: link.label,
      url: link.url,
      position: index,
    }));

    await supabase.from("channel_links").insert(linksToInsert);

    setChannel(prev => ({ ...prev, links: tempLinks }));
    setSaving(false);
    setEditDialog(null);
  };

  // Link management
  const addLink = () => {
    setTempLinks(prev => [...prev, { 
      id: `temp-${Date.now()}`, 
      icon: Globe, 
      label: "New Link", 
      url: "https://" 
    }]);
  };

  const removeLink = (id: string) => {
    setTempLinks(prev => prev.filter(l => l.id !== id));
  };

  const updateLink = (id: string, field: "label" | "url", value: string) => {
    setTempLinks(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  // Open dialog with current values
  const openDialog = (type: EditDialog) => {
    if (type === "name") setTempName(channel.name);
    if (type === "handle") setTempHandle(channel.handle);
    if (type === "description") setTempDescription(channel.description);
    if (type === "links") setTempLinks([...channel.links]);
    if (type === "subs") setTempSubCount(subCount.toString());
    if (type === "videos") setTempVideoCount(videoCount.toString());
    setEditDialog(type);
  };

  // Toolbar buttons config
  const toolbarButtons = [
    { id: "banner" as const, icon: Image, label: "Banner" },
    { id: "icon" as const, icon: User, label: "Icon" },
    { id: "name" as const, icon: Type, label: "Name" },
    { id: "handle" as const, icon: AtSign, label: "Handle" },
    { id: "subs" as const, icon: User, label: "Subscribers" },
    { id: "videos" as const, icon: FileText, label: "Videos" },
    { id: "description" as const, icon: FileText, label: "Description" },
    { id: "links" as const, icon: Link2, label: "Links" },
  ];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Hidden file inputs */}
      <input 
        ref={bannerInputRef}
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={handleBannerUpload}
      />
      <input 
        ref={iconInputRef}
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={handleIconUpload}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Channel Preview</h1>
          <p className="text-muted-foreground">See how your channel looks on YouTube</p>
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground mr-2">View:</span>
          <div className="glass rounded-lg p-1 flex">
            <button
              onClick={() => setViewMode("landscape")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
                viewMode === "landscape" 
                  ? "bg-white/10 text-white" 
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              <Monitor className="w-4 h-4" />
              Desktop
            </button>
            <button
              onClick={() => setViewMode("portrait")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
                viewMode === "portrait" 
                  ? "bg-white/10 text-white" 
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              Mobile
            </button>
            <button
              onClick={() => setViewMode("tv")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
                viewMode === "tv" 
                  ? "bg-white/10 text-white" 
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              <Tv className="w-4 h-4" />
              TV
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground mr-2">Edit:</span>
          {toolbarButtons.map((btn) => (
            <Button
              key={btn.id}
              variant="outline"
              size="sm"
              onClick={() => openDialog(btn.id)}
              className="gap-2"
            >
              <btn.icon className="w-4 h-4" />
              {btn.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Preview Container */}
      <div className="glass-card overflow-hidden">
        {viewMode === "tv" ? (
          <TVPreview channel={channel} openDialog={openDialog} />
        ) : viewMode === "landscape" ? (
          <DesktopPreview channel={channel} openDialog={openDialog} />
        ) : (
          <MobilePreview channel={channel} openDialog={openDialog} />
        )}
      </div>

      {/* ========== DIALOGS ========== */}
      
      {/* Banner Dialog */}
      <Dialog open={editDialog === "banner"} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Channel Banner</DialogTitle>
            <DialogDescription>
              Upload a banner image for your channel. Recommended size: 2560 x 1440 pixels.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {channel.banner ? (
              <div className="relative rounded-lg overflow-hidden">
                <img src={channel.banner} alt="Banner preview" className="w-full aspect-[16/9] object-cover" />
              </div>
            ) : (
              <div className="w-full aspect-[16/9] rounded-lg bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center">
                <span className="text-muted-foreground">No banner uploaded</span>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => bannerInputRef.current?.click()} className="flex-1 gap-2">
                <Upload className="w-4 h-4" />
                {channel.banner ? "Replace" : "Upload"}
              </Button>
              {channel.banner && (
                <>
                  <Button variant="outline" onClick={() => {
                    const link = document.createElement('a');
                    link.href = channel.banner!;
                    link.download = 'banner.jpg';
                    link.click();
                  }}>
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" onClick={() => {
                    setChannel(prev => ({ ...prev, banner: null }));
                    setEditDialog(null);
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Icon Dialog */}
      <Dialog open={editDialog === "icon"} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Channel Icon</DialogTitle>
            <DialogDescription>
              Upload a profile picture for your channel. Recommended: 800 x 800 pixels.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              {channel.icon ? (
                <img src={channel.icon} alt="Icon preview" className="w-32 h-32 rounded-full object-cover" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center">
                  <User className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => iconInputRef.current?.click()} className="gap-2">
                <Upload className="w-4 h-4" />
                {channel.icon ? "Replace" : "Upload"}
              </Button>
              {channel.icon && (
                <>
                  <Button variant="outline" onClick={() => {
                    const link = document.createElement('a');
                    link.href = channel.icon!;
                    link.download = 'icon.jpg';
                    link.click();
                  }}>
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" onClick={() => {
                    setChannel(prev => ({ ...prev, icon: null }));
                    setEditDialog(null);
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Name Dialog */}
      <Dialog open={editDialog === "name"} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Channel Name</DialogTitle>
            <DialogDescription>
              Enter your channel name as it appears on YouTube.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-primary focus:outline-none text-lg"
              placeholder="Channel name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button onClick={saveName}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Handle Dialog */}
      <Dialog open={editDialog === "handle"} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Channel Handle</DialogTitle>
            <DialogDescription>
              Your unique @handle on YouTube.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              type="text"
              value={tempHandle}
              onChange={(e) => setTempHandle(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-primary focus:outline-none"
              placeholder="@yourhandle"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button onClick={saveHandle}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Description Dialog */}
      <Dialog open={editDialog === "description"} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Channel Description</DialogTitle>
            <DialogDescription>
              Tell viewers about your channel. This appears on your About page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              value={tempDescription}
              onChange={(e) => setTempDescription(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-primary focus:outline-none resize-none"
              placeholder="Describe your channel..."
            />
            <p className="text-sm text-muted-foreground">{tempDescription.length} / 5000 characters</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button onClick={saveDescription}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Links Dialog */}
      <Dialog open={editDialog === "links"} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Channel Links</DialogTitle>
            <DialogDescription>
              Add links to your website and social media profiles.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {tempLinks.map((link) => (
              <div key={link.id} className="flex items-center gap-2 p-3 rounded-lg bg-white/5">
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                <input
                  type="text"
                  value={link.label}
                  onChange={(e) => updateLink(link.id, "label", e.target.value)}
                  className="w-32 px-3 py-2 rounded-md bg-white/5 border border-white/10 focus:border-primary focus:outline-none text-sm"
                  placeholder="Label"
                />
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => updateLink(link.id, "url", e.target.value)}
                  className="flex-1 px-3 py-2 rounded-md bg-white/5 border border-white/10 focus:border-primary focus:outline-none text-sm"
                  placeholder="https://..."
                />
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => removeLink(link.id)}
                  className="text-muted-foreground hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {tempLinks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No links added yet
              </div>
            )}
          </div>
          <Button variant="outline" onClick={addLink} className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Add Link
          </Button>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button onClick={saveLinks} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscribers Dialog */}
      <Dialog open={editDialog === "subs"} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscriber Count</DialogTitle>
            <DialogDescription>
              Enter the number of subscribers for preview purposes.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="number"
            placeholder="0"
            value={tempSubCount}
            onChange={(e) => setTempSubCount(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button onClick={() => {
              setSubCount(parseInt(tempSubCount) || 0);
              setEditDialog(null);
            }}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Videos Dialog */}
      <Dialog open={editDialog === "videos"} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Video Count</DialogTitle>
            <DialogDescription>
              Enter the number of videos for preview purposes.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="number"
            placeholder="0"
            value={tempVideoCount}
            onChange={(e) => setTempVideoCount(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button onClick={() => {
              setVideoCount(parseInt(tempVideoCount) || 0);
              setEditDialog(null);
            }}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== PREVIEW COMPONENTS ==========

interface PreviewProps {
  channel: {
    banner: string | null;
    icon: string | null;
    name: string;
    handle: string;
    subs: string;
    videos: string;
    description: string;
    links: ChannelLink[];
  };
  openDialog: (type: EditDialog) => void;
}

function TVPreview({ channel, openDialog }: PreviewProps) {
  return (
    <div className="bg-[#0f0f0f] aspect-video max-h-[600px] overflow-hidden">
      <div className="h-full flex">
        {/* Left Sidebar */}
        <div className="w-20 bg-black/50 flex flex-col items-center py-6 gap-6 shrink-0">
          <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
            </svg>
          </div>
          <div className="w-8 h-8 rounded bg-white/10" />
          <div className="w-8 h-8 rounded bg-white/10" />
          <div className="w-8 h-8 rounded bg-white/10" />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {/* Banner */}
          <div className="w-full h-[140px] bg-gradient-to-r from-purple-600/30 to-blue-600/30 flex items-center justify-center">
            {channel.banner ? (
              <img src={channel.banner} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <span className="text-muted-foreground/50 text-lg">Channel Banner</span>
            )}
          </div>

          {/* Channel Info Row */}
          <div className="p-6 flex items-center gap-6">
            {/* Icon */}
            <div className="w-[100px] h-[100px] rounded-full bg-gradient-to-br from-white/20 to-white/5 border-4 border-[#0f0f0f] -mt-12 flex items-center justify-center shrink-0 overflow-hidden">
              {channel.icon ? (
                <img src={channel.icon} alt="Icon" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-muted-foreground/50">C</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{channel.name}</h1>
              <div className="flex items-center gap-3 text-muted-foreground mt-1">
                <span>{channel.handle}</span>
                <span>•</span>
                <span>{channel.subs}</span>
                <span>•</span>
                <span>{channel.videos}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1 mt-2">{channel.description}</p>
            </div>

            {/* Subscribe Button */}
            <Button className="bg-white text-black hover:bg-white/90 rounded-sm px-8 text-lg h-12 shrink-0">
              Subscribe
            </Button>
          </div>

          {/* Video Grid */}
          <div className="px-6 pb-6">
            <div className="flex items-center gap-4 mb-4">
              {["Home", "Videos", "Playlists", "Community"].map((tab, i) => (
                <button 
                  key={tab}
                  className={`text-lg font-medium px-4 py-2 rounded ${i === 0 ? "bg-white/10 text-white" : "text-muted-foreground"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="aspect-video rounded-lg bg-white/5" />
                  <div className="h-4 rounded bg-white/10 w-full" />
                  <div className="h-3 rounded bg-white/5 w-2/3" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopPreview({ channel, openDialog }: PreviewProps) {
  return (
    <div className="w-full px-8">
      {/* Banner */}
      <div className="px-6">
        <div className="w-full h-[200px] bg-gradient-to-r from-purple-600/30 to-blue-600/30 flex items-center justify-center rounded-xl">
          {channel.banner ? (
            <img src={channel.banner} alt="Banner" className="w-full h-full object-cover rounded-xl" />
          ) : (
            <span className="text-muted-foreground/50">Channel Banner</span>
          )}
        </div>
      </div>

      {/* Channel Info */}
      <div className="px-6">
        <div className="flex gap-6 items-center pt-6">
          {/* Icon */}
          <div className="w-[180px] h-[180px] rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center shrink-0 overflow-hidden">
            {channel.icon ? (
              <img src={channel.icon} alt="Icon" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-muted-foreground/50">C</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 pt-2">
            <h1 className="text-4xl font-bold">{channel.name}</h1>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
              <span>{channel.handle}</span>
              <span>•</span>
              <span>{channel.subs}</span>
              <span>•</span>
              <span>{channel.videos}</span>
            </div>

            <p className="text-sm text-muted-foreground mt-3">
              {channel.description || "Welcome to my channel!"}
              {channel.description && channel.description.length > 150 && (
                <button className="text-blue-400 ml-1">...more</button>
              )}
            </p>

            <div className="flex items-center gap-3 mt-3">
              {channel.links.length > 0 ? (
                channel.links.map((link) => (
                  <a key={link.id} href={link.url} className="text-sm text-blue-400 hover:underline truncate">
                    {link.url}
                  </a>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No links added</span>
              )}
            </div>

            <Button className="bg-white text-black hover:bg-white/90 rounded-full px-6 mt-3">
              Subscribe
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-8 mt-6 border-b border-white/10 pb-2">
          {["Home", "Videos", "Shorts", "Live", "Playlists", "Community"].map((tab, i) => (
            <button 
              key={tab}
              className={`text-sm font-medium pb-2 ${i === 0 ? "text-white border-b-2 border-white" : "text-muted-foreground"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Video Section */}
        <div className="mt-6 pb-6">
          <h2 className="text-lg font-semibold mb-4">Videos</h2>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-video rounded-xl bg-white/5" />
                <div className="h-4 rounded bg-white/10 w-full" />
                <div className="h-3 rounded bg-white/5 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobilePreview({ channel, openDialog }: PreviewProps) {
  return (
    <div className="w-[375px] mx-auto bg-[#0f0f0f] min-h-[700px]">
      {/* Banner */}
      <div className="px-4 pt-4">
        <div className="w-full h-[100px] bg-gradient-to-r from-purple-600/30 to-blue-600/30 flex items-center justify-center rounded-lg">
          {channel.banner ? (
            <img src={channel.banner} alt="Banner" className="w-full h-full object-cover rounded-lg" />
          ) : (
            <span className="text-xs text-muted-foreground/50">Banner</span>
          )}
        </div>
      </div>

      {/* Channel Info */}
      <div className="px-4">
        {/* Profile Image and Stats Row */}
        <div className="flex gap-3 pt-4">
          {/* Icon */}
          <div className="w-[80px] h-[80px] rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center overflow-hidden shrink-0">
            {channel.icon ? (
              <img src={channel.icon} alt="Icon" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-muted-foreground/50">C</span>
            )}
          </div>

          {/* Stats */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{channel.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{channel.handle}</p>
            <p className="text-sm text-muted-foreground mt-1">{channel.subs} • {channel.videos}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground mt-4">
          {channel.description || "Welcome to my channel!"}
          {channel.description && channel.description.length > 80 && (
            <button className="text-blue-400 ml-1">...more</button>
          )}
        </p>

        {/* Links */}
        <div className="flex flex-col gap-1 mt-3">
          {channel.links.length > 0 ? (
            channel.links.map((link) => (
              <a key={link.id} href={link.url} className="text-sm text-blue-400 hover:underline truncate">
                {link.url}
              </a>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">No links added</span>
          )}
        </div>

        <Button className="bg-white text-black hover:bg-white/90 rounded-full w-full mt-4">
          Subscribe
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 px-4 border-b border-white/10 overflow-x-auto">
        {["Home", "Videos", "Shorts", "Playlists"].map((tab, i) => (
          <button 
            key={tab}
            className={`text-sm font-medium py-3 whitespace-nowrap ${i === 0 ? "text-white border-b-2 border-white" : "text-muted-foreground"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Video Section */}
      <div className="p-4">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-[160px] aspect-video rounded-lg bg-white/5 shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 rounded bg-white/10 w-full" />
                <div className="h-3 rounded bg-white/10 w-3/4" />
                <div className="h-2 rounded bg-white/5 w-1/2 mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
