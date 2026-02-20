"use client";

import { useState, use, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Image,
  Trash2,
  Check,
  ListVideo,
  Copy,
  X
} from "lucide-react";
import { toast } from "sonner";
// YouTubePush hidden until YouTube connection is re-enabled
// import { YouTubePush } from "@/components/project/youtube-push";

interface PackagingSet {
  id: string;
  title: string;
  thumbnail: string | null;
  selected: boolean;
}

interface Playlist {
  id: string;
  name: string;
  description: string | null;
}

interface PackagingPageProps {
  params: Promise<{ studioSlug: string; projectId: string }>;
}

async function fetchPlaylists(studioSlug: string): Promise<Playlist[]> {
  const supabase = createClient();
  
  // Get organization by slug
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", studioSlug)
    .single();
    
  if (!org) return [];
  
  const { data, error } = await supabase
    .from("playlists")
    .select("id, name, description")
    .eq("organization_id", org.id)
    .order("name");
    
  if (error) throw error;
  return data || [];
}

async function createPlaylist(studioSlug: string, name: string): Promise<Playlist> {
  const supabase = createClient();
  
  // Get organization by slug
  const { data: org } = await supabase
    .from("organizations")
    .select("id, channels(id)")
    .eq("slug", studioSlug)
    .single();
    
  if (!org) throw new Error("Organization not found");
  
  // Get first channel for the org (optional - may not have one yet)
  const channelId = (org as any).channels?.[0]?.id || null;
  
  const { data, error } = await supabase
    .from("playlists")
    .insert({
      organization_id: org.id,
      channel_id: channelId,
      name,
    })
    .select("id, name, description")
    .single();
    
  if (error) throw error;
  return data;
}

async function deletePlaylist(playlistId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("playlists")
    .delete()
    .eq("id", playlistId);
  if (error) throw error;
}

export default function PackagingPage({ params }: PackagingPageProps) {
  const { studioSlug, projectId } = use(params);
  const queryClient = useQueryClient();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState<PackagingSet[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [videoType, setVideoType] = useState<string>("long");
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  
  // Thumbnail upload ref and state
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [uploadingSetId, setUploadingSetId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [youtubeLastSynced, setYoutubeLastSynced] = useState<string | null>(null);

  useEffect(() => {
    loadPackagingData();
  }, [projectId]);

  const loadPackagingData = async () => {
    setLoading(true);

    // Get organization ID from slug
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", studioSlug)
      .single();
    
    if (org) {
      setOrganizationId(org.id);
    }

    // Load project data
    const { data: project } = await supabase
      .from("projects")
      .select("description, video_type, youtube_video_id, youtube_last_synced_at")
      .eq("id", projectId)
      .single();

    if (project) {
      setDescription(project.description || "");
      setVideoType(project.video_type || "long");
      setYoutubeVideoId(project.youtube_video_id || null);
      setYoutubeLastSynced(project.youtube_last_synced_at || null);
    }

    // Load packaging sets
    const { data: setsData } = await supabase
      .from("packaging_sets")
      .select("*")
      .eq("project_id", projectId)
      .order("position");

    if (setsData && setsData.length > 0) {
      setSets(setsData.map(s => ({
        id: s.id,
        title: s.title,
        thumbnail: s.thumbnail_url,
        selected: s.is_selected,
      })));
    } else {
      // Create first set if none exist
      const { data: newSet } = await supabase
        .from("packaging_sets")
        .insert({
          project_id: projectId,
          title: "",
          is_selected: true,
          position: 0,
        })
        .select()
        .single();

      if (newSet) {
        setSets([{
          id: newSet.id,
          title: newSet.title,
          thumbnail: newSet.thumbnail_url,
          selected: newSet.is_selected,
        }]);
      }
    }

    // Load tags
    const { data: tagsData } = await supabase
      .from("project_tags")
      .select("tag")
      .eq("project_id", projectId);

    if (tagsData) {
      setTags(tagsData.map(t => t.tag));
    }

    // Load playlist assignments (multiple)
    const { data: playlistData } = await supabase
      .from("project_playlists")
      .select("playlist_id")
      .eq("project_id", projectId);

    if (playlistData && playlistData.length > 0) {
      setSelectedPlaylists(playlistData.map(p => p.playlist_id));
    }

    setLoading(false);
  };

  const saveDescription = async (value: string) => {
    setDescription(value);
    await supabase
      .from("projects")
      .update({ description: value })
      .eq("id", projectId);
  };

  const saveVideoType = async (value: string) => {
    setVideoType(value);
    await supabase
      .from("projects")
      .update({ video_type: value })
      .eq("id", projectId);
  };

  const selectSet = async (id: string) => {
    // Update locally
    setSets(sets.map(s => ({ ...s, selected: s.id === id })));

    // Update in DB - first unselect all
    await supabase
      .from("packaging_sets")
      .update({ is_selected: false })
      .eq("project_id", projectId);

    // Then select the chosen one
    await supabase
      .from("packaging_sets")
      .update({ is_selected: true })
      .eq("id", id);

    // Notify layout to update the project title
    window.dispatchEvent(new CustomEvent("packaging-set-changed", { detail: { projectId } }));
  };

  const addSet = async () => {
    if (sets.length < 6) {
      const { data: newSet } = await supabase
        .from("packaging_sets")
        .insert({
          project_id: projectId,
          title: "",
          is_selected: false,
          position: sets.length,
        })
        .select()
        .single();

      if (newSet) {
        setSets([...sets, {
          id: newSet.id,
          title: newSet.title,
          thumbnail: newSet.thumbnail_url,
          selected: newSet.is_selected,
        }]);
      }
    }
  };

  const removeSet = async (id: string) => {
    const removingSelected = sets.find(s => s.id === id)?.selected;
    const newSets = sets.filter(s => s.id !== id);
    
    // Delete from DB
    await supabase
      .from("packaging_sets")
      .delete()
      .eq("id", id);

    // If we removed the selected set, select the first remaining
    if (removingSelected && newSets.length > 0) {
      newSets[0].selected = true;
      await supabase
        .from("packaging_sets")
        .update({ is_selected: true })
        .eq("id", newSets[0].id);
    }
    
    setSets(newSets);
  };

  const updateSetTitle = async (id: string, title: string) => {
    setSets(sets.map(s => s.id === id ? { ...s, title } : s));
    
    // Debounced save to DB
    await supabase
      .from("packaging_sets")
      .update({ title })
      .eq("id", id);

    // If this is the selected set, notify layout
    const set = sets.find(s => s.id === id);
    if (set?.selected) {
      window.dispatchEvent(new CustomEvent("packaging-set-changed", { detail: { projectId } }));
    }
  };

  const handleThumbnailClick = (setId: string) => {
    setUploadingSetId(setId);
    thumbnailInputRef.current?.click();
  };

  const uploadThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingSetId) {
      setUploadingSetId(null);
      return;
    }

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      setUploadingSetId(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      setUploadingSetId(null);
      return;
    }

    const setId = uploadingSetId;
    
    try {
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `thumbnails/${projectId}/${setId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('thumbnails')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        toast.error('Failed to upload thumbnail');
        console.error('Upload error:', uploadError);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(fileName);

      // Update DB
      await supabase
        .from('packaging_sets')
        .update({ thumbnail_url: publicUrl })
        .eq('id', setId);

      // Update local state
      setSets(sets.map(s => s.id === setId ? { ...s, thumbnail: publicUrl } : s));
      toast.success('Thumbnail uploaded');
    } catch (err) {
      console.error('Thumbnail upload error:', err);
      toast.error('Failed to upload thumbnail');
    } finally {
      setUploadingSetId(null);
      // Clear the input so the same file can be selected again
      if (thumbnailInputRef.current) {
        thumbnailInputRef.current.value = '';
      }
    }
  };

  const saveTags = async (newTags: string[]) => {
    setTags(newTags);

    // Delete all existing tags
    await supabase
      .from("project_tags")
      .delete()
      .eq("project_id", projectId);

    // Insert new tags
    if (newTags.length > 0) {
      await supabase
        .from("project_tags")
        .insert(newTags.map(tag => ({ project_id: projectId, tag })));
    }
  };

  const savePlaylist = async (playlistIds: string[]) => {
    setSelectedPlaylists(playlistIds);

    // Delete existing playlist assignments
    await supabase
      .from("project_playlists")
      .delete()
      .eq("project_id", projectId);

    // Add new assignments if any selected
    if (playlistIds.length > 0) {
      await supabase
        .from("project_playlists")
        .insert(playlistIds.map(id => ({ project_id: projectId, playlist_id: id })));
    }
  };

  const togglePlaylist = (playlistId: string) => {
    const newPlaylists = selectedPlaylists.includes(playlistId)
      ? selectedPlaylists.filter(id => id !== playlistId)
      : [...selectedPlaylists, playlistId];
    savePlaylist(newPlaylists);
  };
  const { data: playlists = [] } = useQuery({
    queryKey: ["playlists", studioSlug],
    queryFn: () => fetchPlaylists(studioSlug),
  });

  const createPlaylistMutation = useMutation({
    mutationFn: () => createPlaylist(studioSlug, newPlaylistName),
    onSuccess: (newPlaylist) => {
      queryClient.invalidateQueries({ queryKey: ["playlists", studioSlug] });
      savePlaylist([...selectedPlaylists, newPlaylist.id]);
      setShowCreatePlaylist(false);
      setNewPlaylistName("");
    },
  });

  const deletePlaylistMutation = useMutation({
    mutationFn: (playlistId: string) => deletePlaylist(playlistId),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["playlists", studioSlug] });
      // Remove from selection if it was selected
      if (selectedPlaylists.includes(deletedId)) {
        savePlaylist(selectedPlaylists.filter(id => id !== deletedId));
      }
      toast.success("Playlist deleted");
    },
    onError: () => {
      toast.error("Failed to delete playlist");
    },
  });

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 w-[60%] mx-auto">
      {/* Sets Section */}
      <div data-tutorial="sets-section" className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Title & Thumbnail Sets</h2>
            <p className="text-sm text-muted-foreground">Create up to 6 variations to compare ({sets.length}/6)</p>
          </div>
        </div>

        <div className={`grid gap-4 ${videoType === 'short' ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {sets.map((set, index) => (
            <div 
              key={set.id}
              onClick={() => selectSet(set.id)}
              className={`glass-card p-3 cursor-pointer transition-all ${
                set.selected 
                  ? "ring-2 ring-primary border-primary/50" 
                  : "hover:border-white/20"
              }`}
            >
              {/* Selection & Set Label */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    set.selected ? "border-primary bg-primary" : "border-white/30"
                  }`}>
                    {set.selected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    Set {index + 1}
                  </span>
                  {set.selected && (
                    <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSet(set.id);
                  }}
                  disabled={sets.length <= 1}
                  className="h-6 w-6 text-muted-foreground hover:text-red-500"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              {/* Thumbnail */}
              <div 
                data-tutorial={index === 0 ? "thumbnail-upload" : undefined} 
                onClick={(e) => {
                  e.stopPropagation();
                  handleThumbnailClick(set.id);
                }}
                className={`${videoType === 'short' ? 'aspect-[9/16]' : 'aspect-video'} rounded-lg bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-white/20 transition-colors mb-2 relative overflow-hidden`}
              >
                {uploadingSetId === set.id ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] text-muted-foreground">Uploading...</span>
                  </div>
                ) : set.thumbnail ? (
                  <img src={set.thumbnail} alt="" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <>
                    <Image className="w-6 h-6 text-muted-foreground/50" />
                    <span className="text-[10px] text-muted-foreground">Click to upload</span>
                  </>
                )}
              </div>

              {/* Title underneath */}
              <Input 
                data-tutorial={index === 0 ? "title-input" : undefined}
                value={set.title}
                onChange={(e) => {
                  e.stopPropagation();
                  updateSetTitle(set.id, e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="Enter video title..."
                className="text-xs border-0 bg-transparent p-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/50"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {set.title.length} characters
              </p>
            </div>
          ))}

          {/* Ghost Add Set Card */}
          {sets.length < 6 && (
            <button 
              onClick={addSet}
              className="p-3 rounded-xl border-2 border-dashed border-white/10 text-muted-foreground hover:border-white/20 hover:bg-white/[0.02] transition-all flex flex-col items-center justify-center gap-2 min-h-[180px]"
            >
              <Plus className="w-8 h-8 text-muted-foreground/50" />
              <span className="text-xs text-muted-foreground/70">Add Set {sets.length + 1}</span>
            </button>
          )}
        </div>
        
        {/* Hidden file input for thumbnail uploads */}
        <input
          ref={thumbnailInputRef}
          type="file"
          accept="image/*"
          onChange={uploadThumbnail}
          className="hidden"
        />
      </div>

      {/* Description, Video Type & Other Fields */}
      <div data-tutorial="metadata-section" className="space-y-4">
        {/* Row 1: Description (full width) */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-3">Description</h2>
          <Textarea 
            value={description}
            onChange={(e) => saveDescription(e.target.value)}
            placeholder="Write your video description..."
            className="glass border-white/10 min-h-[100px]"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {description.length} characters
          </p>
        </div>

        {/* Row 2: Tags (full width) */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-3">Tags</h2>
          <div className="flex items-start gap-2">
            {/* Tags container like YouTube */}
            <div className="flex-1 flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-black/20 border border-white/10 min-h-[40px]">
              {tags.map((tag, i) => (
                <span 
                  key={i}
                  className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded bg-white/10 text-xs"
                >
                  {tag}
                  <button 
                    onClick={() => saveTags(tags.filter((_, idx) => idx !== i))}
                    className="opacity-50 hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/10"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input 
                placeholder={tags.length === 0 ? "Enter a comma after each tag" : ""}
                className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                onKeyDown={(e) => {
                  const input = e.currentTarget;
                  const value = input.value.trim();
                  if ((e.key === "Enter" || e.key === ",") && value) {
                    e.preventDefault();
                    const cleanValue = value.replace(/,+$/, '').trim();
                    if (cleanValue && !tags.includes(cleanValue)) {
                      saveTags([...tags, cleanValue]);
                    }
                    input.value = "";
                  } else if (e.key === "Backspace" && !value && tags.length > 0) {
                    // Delete last tag when backspace on empty input
                    saveTags(tags.slice(0, -1));
                  }
                }}
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  if (value.includes(',')) {
                    const parts = value.split(',').map(p => p.trim()).filter(p => p);
                    if (parts.length > 0) {
                      const newTags = parts.filter(p => !tags.includes(p));
                      if (newTags.length > 0) {
                        saveTags([...tags, ...newTags]);
                      }
                      e.currentTarget.value = "";
                    }
                  }
                }}
              />
            </div>
            {/* Action buttons */}
            <div className="flex items-center gap-1">
              {tags.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(tags.join(', '));
                      toast.success('Tags copied');
                    }}
                    className="p-2 rounded hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                    title="Copy all tags"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => saveTags([])}
                    className="p-2 rounded hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                    title="Clear all tags"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-right">
            {tags.join(', ').length}/500
          </p>
        </div>

        {/* Row 3: Video Type + Playlist */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Video Type */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold mb-3">Video Type</h2>
            <Select value={videoType} onValueChange={saveVideoType}>
              <SelectTrigger className="glass border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="long">Long Form</SelectItem>
                <SelectItem value="short">Short Form</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Playlist (multi-select) */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <ListVideo className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Playlists</h2>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center justify-between px-3 py-2 rounded-md glass border border-white/10 text-sm hover:bg-white/5 transition-colors">
                  <span className={selectedPlaylists.length === 0 ? "text-muted-foreground" : ""}>
                    {selectedPlaylists.length === 0 
                      ? "Select playlists..." 
                      : `${selectedPlaylists.length} playlist${selectedPlaylists.length > 1 ? 's' : ''} selected`}
                  </span>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                {playlists.map((playlist) => (
                  <div key={playlist.id} className="flex items-center group">
                    <DropdownMenuCheckboxItem
                      checked={selectedPlaylists.includes(playlist.id)}
                      onCheckedChange={() => togglePlaylist(playlist.id)}
                      onSelect={(e) => e.preventDefault()}
                      className="flex-1"
                    >
                      {playlist.name}
                    </DropdownMenuCheckboxItem>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePlaylistMutation.mutate(playlist.id);
                      }}
                      className="px-2 py-1.5 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {playlists.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem 
                  className="text-primary cursor-pointer"
                  onClick={() => setShowCreatePlaylist(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create new playlist
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {selectedPlaylists.length > 0 && (
              <button 
                onClick={() => savePlaylist([])}
                className="text-xs text-muted-foreground hover:text-white mt-2"
              >
                Clear selection
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Create Playlist Dialog */}
      <Dialog open={showCreatePlaylist} onOpenChange={setShowCreatePlaylist}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Create Playlist</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="playlist-name">Name</Label>
              <Input
                id="playlist-name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="My Awesome Playlist"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePlaylist(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createPlaylistMutation.mutate()}
              disabled={!newPlaylistName.trim() || createPlaylistMutation.isPending}
            >
              {createPlaylistMutation.isPending ? "Creating..." : "Create Playlist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}