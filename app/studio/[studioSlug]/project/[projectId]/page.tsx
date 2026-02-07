"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Image,
  Trash2,
  Check,
  Upload,
  Download,
  Type,
  Hash,
  Copy,
  CheckCheck,
  Loader2,
  ListVideo,
  X,
} from "lucide-react";
import { YouTubePush } from "@/components/project/youtube-push";

interface PackagingSet {
  id: string;
  title: string;
  thumbnail_url: string | null;
  is_selected: boolean;
  position: number;
}

interface ProjectData {
  id: string;
  title: string;
  description: string | null;
  video_type: string;
}

interface ProjectTag {
  id: string;
  tag: string;
  position: number;
}

interface Playlist {
  id: string;
  name: string;
  description: string | null;
}

interface YouTubePlaylist {
  id: string;
  title: string;
  itemCount: number;
}

export default function PackagingPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [sets, setSets] = useState<PackagingSet[]>([]);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<ProjectTag[]>([]);
  const [tagsText, setTagsText] = useState("");
  const [showThumbnailDialog, setShowThumbnailDialog] = useState(false);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [tagsCopied, setTagsCopied] = useState(false);
  const [descCopied, setDescCopied] = useState(false);
  
  // Playlist state
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  
  // YouTube state
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [youtubeLastSynced, setYoutubeLastSynced] = useState<string | null>(null);
  const [youtubePlaylists, setYoutubePlaylists] = useState<YouTubePlaylist[]>([]);
  const [selectedYoutubePlaylist, setSelectedYoutubePlaylist] = useState<string | null>(null);
  const [loadingYoutubePlaylists, setLoadingYoutubePlaylists] = useState(false);
  const [showCreateYoutubePlaylist, setShowCreateYoutubePlaylist] = useState(false);
  const [newYoutubePlaylistName, setNewYoutubePlaylistName] = useState("");
  const [creatingYoutubePlaylist, setCreatingYoutubePlaylist] = useState(false);

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const descSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const supabase = createClient();

  // Load all data on mount
  useEffect(() => {
    loadAllData();
  }, [projectId]);

  useEffect(() => {
    if (editingTitleId && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitleId]);

  const loadAllData = async () => {
    setLoading(true);
    
    // Fetch project, sets, tags, and playlists in parallel
    const [projectRes, setsRes, tagsRes] = await Promise.all([
      supabase.from("projects").select("*, organization_id, youtube_video_id, youtube_last_synced_at").eq("id", projectId).single(),
      supabase.from("packaging_sets").select("*").eq("project_id", projectId).order("position"),
      supabase.from("project_tags").select("*").eq("project_id", projectId).order("position"),
    ]);

    if (projectRes.data) {
      setProject(projectRes.data);
      setDescription(projectRes.data.description || "");
      setOrganizationId(projectRes.data.organization_id);
      setYoutubeVideoId(projectRes.data.youtube_video_id || null);
      setYoutubeLastSynced(projectRes.data.youtube_last_synced_at || null);
      
      // Load playlists for the channel (playlists are channel-specific)
      const { data: playlistsData } = await supabase
        .from("playlists")
        .select("id, name, description")
        .eq("channel_id", projectRes.data.channel_id)
        .order("name");
      
      if (playlistsData) setPlaylists(playlistsData);
      
      // Check which playlists the project is in
      const { data: projectPlaylists } = await supabase
        .from("project_playlists")
        .select("playlist_id")
        .eq("project_id", projectId);
      
      if (projectPlaylists) {
        setSelectedPlaylists(projectPlaylists.map(pp => pp.playlist_id));
      }
    }

    if (setsRes.data && setsRes.data.length > 0) {
      setSets(setsRes.data);
    } else if (projectRes.data) {
      // Create initial set with project title
      const newSet = await createSet(projectRes.data.title, true);
      if (newSet) setSets([newSet]);
    }

    if (tagsRes.data) {
      setTags(tagsRes.data);
    }

    setLoading(false);
  };

  // Load YouTube playlists when organization is available
  const loadYoutubePlaylists = async () => {
    if (!organizationId) return;
    
    setLoadingYoutubePlaylists(true);
    try {
      const response = await fetch(`/api/youtube/playlists?organizationId=${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        setYoutubePlaylists(data.playlists || []);
      }
    } catch (error) {
      console.error("Failed to load YouTube playlists:", error);
    }
    setLoadingYoutubePlaylists(false);
  };

  // Create a new YouTube playlist
  const createYoutubePlaylist = async () => {
    if (!organizationId || !newYoutubePlaylistName.trim()) return;
    
    setCreatingYoutubePlaylist(true);
    try {
      const response = await fetch('/api/youtube/playlists/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          title: newYoutubePlaylistName.trim(),
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Add new playlist to list and select it
        setYoutubePlaylists(prev => [data.playlist, ...prev]);
        setSelectedYoutubePlaylist(data.playlist.id);
        setNewYoutubePlaylistName("");
        setShowCreateYoutubePlaylist(false);
      } else {
        const error = await response.json();
        console.error("Failed to create playlist:", error);
      }
    } catch (error) {
      console.error("Failed to create YouTube playlist:", error);
    }
    setCreatingYoutubePlaylist(false);
  };

  // Load playlists when organizationId changes
  useEffect(() => {
    if (organizationId) {
      loadYoutubePlaylists();
    }
  }, [organizationId]);

  // === SET OPERATIONS ===
  const createSet = async (title: string = "", isSelected: boolean = false): Promise<PackagingSet | null> => {
    const position = sets.length;
    
    // If this will be selected, deselect others first
    if (isSelected && sets.length > 0) {
      await supabase
        .from("packaging_sets")
        .update({ is_selected: false })
        .eq("project_id", projectId);
    }

    const { data, error } = await supabase
      .from("packaging_sets")
      .insert({
        project_id: projectId,
        title,
        is_selected: isSelected || sets.length === 0, // First set is always selected
        position,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create set:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return null;
    }
    return data;
  };

  const addSet = async () => {
    if (sets.length >= 6) return;
    setSaving(true);
    
    const newSet = await createSet("", false);
    if (newSet) {
      setSets([...sets, newSet]);
      setEditingTitleId(newSet.id);
    }
    setSaving(false);
  };

  const selectSet = async (id: string) => {
    // Optimistic update
    setSets(sets.map((s) => ({ ...s, is_selected: s.id === id })));

    // Deselect all, then select the one
    await supabase
      .from("packaging_sets")
      .update({ is_selected: false })
      .eq("project_id", projectId);
    
    await supabase
      .from("packaging_sets")
      .update({ is_selected: true })
      .eq("id", id);
  };

  const removeSet = async (id: string) => {
    if (sets.length <= 1) return;
    
    const setToRemove = sets.find(s => s.id === id);
    const newSets = sets.filter((s) => s.id !== id);
    
    // If removing selected set, select the first remaining one
    if (setToRemove?.is_selected && newSets.length > 0) {
      newSets[0].is_selected = true;
      await supabase
        .from("packaging_sets")
        .update({ is_selected: true })
        .eq("id", newSets[0].id);
    }

    setSets(newSets);
    await supabase.from("packaging_sets").delete().eq("id", id);
  };

  const updateSetTitle = async (id: string, title: string) => {
    // Optimistic update
    setSets(sets.map((s) => (s.id === id ? { ...s, title } : s)));
  };

  const saveSetTitle = async (id: string) => {
    const set = sets.find(s => s.id === id);
    if (!set) return;
    
    await supabase
      .from("packaging_sets")
      .update({ title: set.title })
      .eq("id", id);
    
    setEditingTitleId(null);
  };

  const openThumbnailDialog = (setId: string) => {
    setSelectedSetId(setId);
    setShowThumbnailDialog(true);
  };

  const handleThumbnailUpload = async (file: File, setId?: string) => {
    const targetSetId = setId || selectedSetId;
    if (!file || !targetSetId) return;

    setSaving(true);

    try {
      // Delete any existing files for this set first
      const { data: existingFiles } = await supabase.storage
        .from("thumbnails")
        .list(projectId);
      
      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles
          .filter(f => f.name.startsWith(targetSetId))
          .map(f => `${projectId}/${f.name}`);
        if (filesToDelete.length > 0) {
          await supabase.storage.from("thumbnails").remove(filesToDelete);
        }
      }

      // Upload to Supabase Storage with timestamp to ensure unique filename
      const fileExt = file.name.split(".").pop();
      const timestamp = Date.now();
      const fileName = `${projectId}/${targetSetId}_${timestamp}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("thumbnails")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Upload failed:", uploadError);
        // Fallback to blob URL for now
        const url = URL.createObjectURL(file);
        setSets(sets.map((s) => (s.id === targetSetId ? { ...s, thumbnail_url: url } : s)));
      } else {
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("thumbnails")
          .getPublicUrl(fileName);

        // Update database
        await supabase
          .from("packaging_sets")
          .update({ thumbnail_url: publicUrl })
          .eq("id", targetSetId);

        setSets(sets.map((s) => (s.id === targetSetId ? { ...s, thumbnail_url: publicUrl } : s)));
      }
    } finally {
      // Reset file input so same file can be selected again
      if (thumbnailInputRef.current) {
        thumbnailInputRef.current.value = "";
      }
      setShowThumbnailDialog(false);
      setSaving(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleThumbnailUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleThumbnailUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const removeThumbnail = async (setId: string) => {
    setSets(sets.map((s) => (s.id === setId ? { ...s, thumbnail_url: null } : s)));
    
    await supabase
      .from("packaging_sets")
      .update({ thumbnail_url: null })
      .eq("id", setId);
  };

  // === DESCRIPTION ===
  const updateDescription = (value: string) => {
    setDescription(value);
    
    // Debounced save
    if (descSaveTimeoutRef.current) {
      clearTimeout(descSaveTimeoutRef.current);
    }
    descSaveTimeoutRef.current = setTimeout(async () => {
      await supabase
        .from("projects")
        .update({ description: value })
        .eq("id", projectId);
    }, 500);
  };

  // === TAG OPERATIONS ===
  const saveTags = async (newTags: { tag: string; position: number }[]) => {
    // Delete all existing tags
    await supabase
      .from("project_tags")
      .delete()
      .eq("project_id", projectId);
    
    // Insert new tags
    if (newTags.length > 0) {
      const tagsToInsert = newTags.map((t, index) => ({
        project_id: projectId,
        tag: t.tag,
        position: index,
      }));
      
      const { data } = await supabase
        .from("project_tags")
        .insert(tagsToInsert)
        .select();
      
      if (data) {
        setTags(data);
      }
    } else {
      setTags([]);
    }
  };

  const addTags = (tagTexts: string[]) => {
    const existingTags = new Set(tags.map(t => t.tag));
    const newUniqueTags = tagTexts
      .map(t => t.trim().toLowerCase())
      .filter(t => t && !existingTags.has(t));
    
    if (newUniqueTags.length > 0) {
      const newTags = [
        ...tags,
        ...newUniqueTags.map((tag, i) => ({
          id: crypto.randomUUID(),
          tag,
          position: tags.length + i,
        })),
      ];
      setTags(newTags);
      saveTags(newTags);
    }
  };

  const addTag = (tagText: string) => {
    const normalized = tagText.trim().toLowerCase();
    if (!normalized) return;
    
    // Check for duplicate
    if (tags.some(t => t.tag === normalized)) return;
    
    const newTag = { id: crypto.randomUUID(), tag: normalized, position: tags.length };
    const newTags = [...tags, newTag];
    setTags(newTags);
    saveTags(newTags);
  };

  const removeTag = (tagId: string) => {
    const newTags = tags.filter(t => t.id !== tagId);
    setTags(newTags);
    saveTags(newTags);
  };

  const handleTagInputChange = (value: string) => {
    // Check if there are commas - if so, split and add as tags
    if (value.includes(',')) {
      const parts = value.split(',');
      const tagsToAdd = parts.slice(0, -1); // All parts except the last
      const remainder = parts[parts.length - 1]; // Keep last part in input
      
      if (tagsToAdd.length > 0) {
        addTags(tagsToAdd);
      }
      setTagsText(remainder);
    } else {
      setTagsText(value);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagsText.trim()) {
        addTag(tagsText);
        setTagsText('');
      }
    } else if (e.key === 'Backspace' && tagsText === '' && tags.length > 0) {
      // Remove last tag when backspacing on empty input
      removeTag(tags[tags.length - 1].id);
    }
  };

  // === CLIPBOARD ===
  const copyTagsToClipboard = async () => {
    const tagsString = tags.map(t => t.tag).join(", ");
    await navigator.clipboard.writeText(tagsString);
    setTagsCopied(true);
    setTimeout(() => setTagsCopied(false), 2000);
  };

  const copyDescToClipboard = async () => {
    await navigator.clipboard.writeText(description);
    setDescCopied(true);
    setTimeout(() => setDescCopied(false), 2000);
  };

  // === PLAYLIST ===
  const togglePlaylist = async (playlistId: string) => {
    setSaving(true);
    
    const isSelected = selectedPlaylists.includes(playlistId);
    
    if (isSelected) {
      // Remove from playlist
      await supabase
        .from("project_playlists")
        .delete()
        .eq("project_id", projectId)
        .eq("playlist_id", playlistId);
      
      setSelectedPlaylists(selectedPlaylists.filter(id => id !== playlistId));
    } else {
      // Add to playlist
      await supabase
        .from("project_playlists")
        .insert({
          project_id: projectId,
          playlist_id: playlistId,
        });
      
      setSelectedPlaylists([...selectedPlaylists, playlistId]);
    }
    
    setSaving(false);
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim() || !project) return;
    
    setSaving(true);
    
    // Get organization_id and channel_id from project
    const { data: projectData } = await supabase
      .from("projects")
      .select("organization_id, channel_id")
      .eq("id", projectId)
      .single();
    
    if (!projectData) {
      setSaving(false);
      return;
    }
    
    const { data, error } = await supabase
      .from("playlists")
      .insert({
        organization_id: projectData.organization_id,
        channel_id: projectData.channel_id,
        name: newPlaylistName.trim(),
        description: newPlaylistDescription.trim() || null,
      })
      .select()
      .single();
    
    if (data && !error) {
      setPlaylists([...playlists, data]);
      setSelectedPlaylists([...selectedPlaylists, data.id]);
      
      // Also assign this project to the new playlist
      await supabase
        .from("project_playlists")
        .insert({
          project_id: projectId,
          playlist_id: data.id,
        });
    }
    
    setNewPlaylistName("");
    setNewPlaylistDescription("");
    setShowCreatePlaylist(false);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <input
        ref={thumbnailInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div className="max-w-5xl mx-auto">
        {/* Title & Thumbnail Sets */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base md:text-lg font-semibold">
                Title & Thumbnail Sets
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                Create up to 6 variations to A/B test • Click to select active set
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addSet}
              disabled={sets.length >= 6}
              className="gap-2 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              Add Set ({sets.length}/6)
            </Button>
          </div>

          {/* Sets Grid - YouTube Preview Style */}
          <div className={`grid gap-3 md:gap-4 ${project?.video_type === 'short' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {sets.map((set, index) => (
              <div
                key={set.id}
                onClick={() => selectSet(set.id)}
                className={`relative rounded-lg overflow-hidden cursor-pointer transition-all ${
                  set.is_selected
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/20 scale-[1.02]"
                    : "opacity-70 hover:opacity-100 hover:ring-1 hover:ring-white/20"
                }`}
              >
                {/* Selection Badge */}
                <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1.5">
                  <span className="text-[10px] font-medium bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded">
                    Set {index + 1}
                  </span>
                  {set.is_selected && (
                    <span className="flex items-center gap-0.5 text-[10px] font-medium bg-primary text-primary-foreground px-1.5 py-0.5 rounded animate-pulse">
                      <Check className="w-2.5 h-2.5" />
                      Active
                    </span>
                  )}
                </div>

                {/* Delete Button */}
                {sets.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSet(set.id);
                    }}
                    className="absolute top-1.5 right-1.5 z-10 p-1 rounded bg-black/70 backdrop-blur-sm text-white/70 hover:text-red-400 hover:bg-black/90 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}

                {/* YouTube-style Card */}
                <div className="bg-[#0f0f0f] p-2">
                  {/* Thumbnail */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      openThumbnailDialog(set.id);
                    }}
                    className={`${project?.video_type === 'short' ? 'aspect-[9/16]' : 'aspect-video'} rounded-lg bg-gradient-to-br from-white/10 to-white/5 mb-2 overflow-hidden relative group cursor-pointer`}
                  >
                    {set.thumbnail_url ? (
                      <>
                        <img src={set.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="w-4 h-4 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 group-hover:bg-white/5 transition-colors">
                        <Image className="w-6 h-6 text-muted-foreground/40" />
                        <span className="text-[10px] text-muted-foreground">Add thumbnail</span>
                      </div>
                    )}
                  </div>

                  {/* Title Area - Simplified */}
                  <div className="mt-2">
                    {editingTitleId === set.id ? (
                      <textarea
                        ref={titleInputRef}
                        value={set.title}
                        onChange={(e) => updateSetTitle(set.id, e.target.value)}
                        onBlur={() => saveSetTitle(set.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            saveSetTitle(set.id);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Enter title..."
                        rows={2}
                        className="w-full text-xs font-medium bg-white/5 border border-white/20 rounded px-1.5 py-1 focus:outline-none focus:border-primary resize-none"
                      />
                    ) : (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTitleId(set.id);
                        }}
                        className="group/title cursor-text"
                      >
                        <h3 className="text-xs font-medium line-clamp-2 text-white group-hover/title:text-primary transition-colors min-h-[28px]">
                          {set.title || (
                            <span className="text-muted-foreground italic text-[10px]">Click to add title...</span>
                          )}
                        </h3>
                      </div>
                    )}
                  </div>

                  {/* Character count + Set Active button */}
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-[10px] ${set.title.length > 100 ? "text-red-400" : "text-muted-foreground"}`}>
                      {set.title.length}/100
                    </span>
                    {!set.is_selected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selectSet(set.id);
                        }}
                        className="text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        Set Active
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Set Card */}
            {sets.length < 6 && (
              <button
                onClick={addSet}
                className={`rounded-lg border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary ${project?.video_type === 'short' ? 'aspect-[9/16]' : 'aspect-video min-h-[180px]'}`}
              >
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium">Add Set</span>
              </button>
            )}
          </div>
        </div>

        {/* Description - Full width */}
        <div className="glass-card p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <h3 className="font-medium flex items-center gap-2 text-sm md:text-base">
              <Type className="w-4 h-4 text-muted-foreground" />
              Description
            </h3>
            <div className="flex items-center gap-2">
              {description.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyDescToClipboard}
                  className="h-7 px-2 text-xs gap-1.5"
                >
                  {descCopied ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              )}
              <span className="text-xs text-muted-foreground">{description.length} / 5000</span>
            </div>
          </div>
          <textarea
            value={description}
            onChange={(e) => updateDescription(e.target.value)}
            placeholder="Write your video description...&#10;&#10;Include:&#10;• Video summary&#10;• Timestamps&#10;• Links & socials&#10;• Credits"
            rows={6}
            className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg bg-white/5 border border-white/10 focus:border-primary focus:outline-none resize-none text-sm"
          />
        </div>

        {/* Tags & Playlist - Shared row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Tags */}
          <div className="glass-card p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h3 className="font-medium flex items-center gap-2 text-sm md:text-base">
                <Hash className="w-4 h-4 text-muted-foreground" />
                Tags
              </h3>
              <div className="flex items-center gap-2">
                {tags.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyTagsToClipboard}
                    className="h-7 px-2 text-xs gap-1.5"
                  >
                    {tagsCopied ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">{tags.length} tags</span>
              </div>
            </div>
            <div className="min-h-[120px] max-h-[160px] overflow-y-auto px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus-within:border-primary">
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/10 text-sm group"
                  >
                    {tag.tag}
                    <button
                      onClick={() => removeTag(tag.id)}
                      className="opacity-50 hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagsText}
                  onChange={(e) => handleTagInputChange(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => {
                    if (tagsText.trim()) {
                      addTag(tagsText);
                      setTagsText('');
                    }
                  }}
                  placeholder={tags.length === 0 ? "Type a tag and press comma..." : ""}
                  className="flex-1 min-w-[120px] bg-transparent outline-none text-sm py-1"
                />
              </div>
            </div>
          </div>

          {/* Playlist - YouTube Playlists */}
          <div className="glass-card p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h3 className="font-medium flex items-center gap-2 text-sm md:text-base">
                <ListVideo className="w-4 h-4 text-muted-foreground" />
                YouTube Playlists
              </h3>
              <div className="flex items-center gap-2">
                {loadingYoutubePlaylists && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
                {organizationId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateYoutubePlaylist(true)}
                    className="h-7 px-2 text-xs gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New
                  </Button>
                )}
              </div>
            </div>
            
            {/* Create new playlist inline */}
            {showCreateYoutubePlaylist && (
              <div className="flex gap-2 mb-3">
                <Input
                  value={newYoutubePlaylistName}
                  onChange={(e) => setNewYoutubePlaylistName(e.target.value)}
                  placeholder="Playlist name..."
                  className="flex-1 h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newYoutubePlaylistName.trim()) {
                      createYoutubePlaylist();
                    }
                    if (e.key === 'Escape') {
                      setShowCreateYoutubePlaylist(false);
                      setNewYoutubePlaylistName("");
                    }
                  }}
                  autoFocus
                />
                <Button
                  size="sm"
                  className="h-8"
                  onClick={createYoutubePlaylist}
                  disabled={!newYoutubePlaylistName.trim() || creatingYoutubePlaylist}
                >
                  {creatingYoutubePlaylist ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => {
                    setShowCreateYoutubePlaylist(false);
                    setNewYoutubePlaylistName("");
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            <div className="max-h-[180px] overflow-y-auto space-y-0.5 pr-1">
              {!organizationId ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Connect YouTube in Studio Settings
                </p>
              ) : youtubePlaylists.length === 0 && !loadingYoutubePlaylists ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No playlists on your channel
                </p>
              ) : (
                youtubePlaylists.map((playlist) => (
                  <div
                    key={playlist.id}
                    className={`flex items-center gap-3 px-2 py-2 rounded hover:bg-white/5 cursor-pointer ${
                      selectedYoutubePlaylist === playlist.id ? "bg-white/10" : ""
                    }`}
                    onClick={() => setSelectedYoutubePlaylist(
                      selectedYoutubePlaylist === playlist.id ? null : playlist.id
                    )}
                  >
                    <Checkbox
                      checked={selectedYoutubePlaylist === playlist.id}
                      onCheckedChange={() => setSelectedYoutubePlaylist(
                        selectedYoutubePlaylist === playlist.id ? null : playlist.id
                      )}
                      className="h-5 w-5 rounded-none border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-black data-[state=checked]:border-white"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block">{playlist.title}</span>
                      <span className="text-xs text-muted-foreground">{playlist.itemCount} videos</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* YouTube Push - IN DEVELOPMENT: Requires Google OAuth app verification */}
          {/* {organizationId && (
            <div className="glass-card p-6">
              <YouTubePush
                projectId={projectId}
                organizationId={organizationId}
                linkedVideoId={youtubeVideoId}
                lastSyncedAt={youtubeLastSynced}
                hasTitle={sets.some(s => s.is_selected && s.title.trim().length > 0)}
                hasDescription={description.trim().length > 0}
                hasTags={tags.length > 0}
                hasThumbnail={sets.some(s => s.is_selected && s.thumbnail_url)}
                selectedPlaylistId={selectedYoutubePlaylist}
                onVideoLinked={(videoId) => {
                  setYoutubeVideoId(videoId);
                  if (!videoId) setYoutubeLastSynced(null);
                }}
              />
            </div>
          )} */}
        </div>
      </div>

      {/* Thumbnail Upload Dialog */}
      <Dialog open={showThumbnailDialog} onOpenChange={setShowThumbnailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Thumbnail</DialogTitle>
            <DialogDescription>
              Recommended size: 1280 x 720 pixels (16:9 aspect ratio)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedSetId && sets.find((s) => s.id === selectedSetId)?.thumbnail_url ? (
              <div 
                className="relative rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => thumbnailInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <img
                  src={sets.find((s) => s.id === selectedSetId)?.thumbnail_url!}
                  alt="Thumbnail preview"
                  className="w-full aspect-video object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                  <Upload className="w-8 h-8 text-white mb-2" />
                  <span className="text-white text-sm">Click or drop to replace</span>
                </div>
              </div>
            ) : (
              <div 
                className="w-full aspect-video rounded-lg bg-white/5 border-2 border-dashed border-white/20 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center cursor-pointer"
                onClick={() => thumbnailInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <Upload className="w-12 h-12 text-muted-foreground/50 mb-2" />
                <span className="text-muted-foreground">Click or drag & drop an image</span>
                <span className="text-muted-foreground/50 text-xs mt-1">PNG, JPG, WebP</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => thumbnailInputRef.current?.click()} className="flex-1 gap-2" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {selectedSetId && sets.find((s) => s.id === selectedSetId)?.thumbnail_url
                  ? "Replace"
                  : "Upload"}
              </Button>
              {selectedSetId && sets.find((s) => s.id === selectedSetId)?.thumbnail_url && (
                <>
                  <Button variant="outline">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (selectedSetId) {
                        removeThumbnail(selectedSetId);
                        setShowThumbnailDialog(false);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Playlist Dialog */}
      <Dialog open={showCreatePlaylist} onOpenChange={setShowCreatePlaylist}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Playlist</DialogTitle>
            <DialogDescription>
              Create a new playlist to organize your videos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="playlist-name">Name</Label>
              <Input
                id="playlist-name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="My Playlist"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="playlist-description">Description (optional)</Label>
              <Textarea
                id="playlist-description"
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
                placeholder="What's this playlist about?"
                rows={3}
                className="bg-white/5 border-white/10 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePlaylist(false)}>
              Cancel
            </Button>
            <Button onClick={createPlaylist} disabled={!newPlaylistName.trim() || saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Playlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Saving indicator */}
      {saving && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}