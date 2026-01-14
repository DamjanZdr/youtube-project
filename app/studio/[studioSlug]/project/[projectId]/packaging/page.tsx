"use client";

import { useState, use } from "react";
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
  GripVertical,
  Check,
  ListVideo
} from "lucide-react";

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

async function createPlaylist(studioSlug: string, name: string, description: string): Promise<Playlist> {
  const supabase = createClient();
  
  // Get organization by slug
  const { data: org } = await supabase
    .from("organizations")
    .select("id, channels(id)")
    .eq("slug", studioSlug)
    .single();
    
  if (!org) throw new Error("Organization not found");
  
  // Get first channel for the org
  const channelId = (org as any).channels?.[0]?.id;
  if (!channelId) throw new Error("No channel found");
  
  const { data, error } = await supabase
    .from("playlists")
    .insert({
      organization_id: org.id,
      channel_id: channelId,
      name,
      description: description || null,
    })
    .select("id, name, description")
    .single();
    
  if (error) throw error;
  return data;
}

export default function PackagingPage({ params }: PackagingPageProps) {
  const { studioSlug, projectId } = use(params);
  const queryClient = useQueryClient();
  
  const [sets, setSets] = useState<PackagingSet[]>([
    { id: "1", title: "10 Tips That Changed My Life", thumbnail: null, selected: true },
    { id: "2", title: "You Wont Believe What Happened", thumbnail: null, selected: false },
    { id: "3", title: "The Ultimate Guide to Productivity", thumbnail: null, selected: false },
  ]);
  
  const [tags, setTags] = useState(["productivity", "tips", "lifestyle"]);
  const [description, setDescription] = useState("");
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");

  const { data: playlists = [] } = useQuery({
    queryKey: ["playlists", studioSlug],
    queryFn: () => fetchPlaylists(studioSlug),
  });

  const createPlaylistMutation = useMutation({
    mutationFn: () => createPlaylist(studioSlug, newPlaylistName, newPlaylistDescription),
    onSuccess: (newPlaylist) => {
      queryClient.invalidateQueries({ queryKey: ["playlists", studioSlug] });
      setSelectedPlaylist(newPlaylist.id);
      setShowCreatePlaylist(false);
      setNewPlaylistName("");
      setNewPlaylistDescription("");
    },
  });

  const selectSet = (id: string) => {
    setSets(sets.map(s => ({ ...s, selected: s.id === id })));
  };

  const addSet = () => {
    if (sets.length < 5) {
      setSets([...sets, { id: Date.now().toString(), title: "", thumbnail: null, selected: false }]);
    }
  };

  const removeSet = (id: string) => {
    const newSets = sets.filter(s => s.id !== id);
    if (newSets.length > 0 && !newSets.some(s => s.selected)) {
      newSets[0].selected = true;
    }
    setSets(newSets);
  };

  const updateSetTitle = (id: string, title: string) => {
    setSets(sets.map(s => s.id === id ? { ...s, title } : s));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Sets Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Title & Thumbnail Sets</h2>
            <p className="text-sm text-muted-foreground">Create up to 5 variations to compare ({sets.length}/5)</p>
          </div>
          <Button 
            variant="outline" 
            onClick={addSet}
            disabled={sets.length >= 5}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Set
          </Button>
        </div>

        <div className="space-y-4">
          {sets.map((set, index) => (
            <div 
              key={set.id}
              onClick={() => selectSet(set.id)}
              className={`glass-card p-4 cursor-pointer transition-all ${
                set.selected 
                  ? "ring-2 ring-primary border-primary/50" 
                  : "hover:border-white/20"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Drag Handle & Selection */}
                <div className="flex flex-col items-center gap-3 pt-2">
                  <GripVertical className="w-5 h-5 text-muted-foreground/30 cursor-grab" />
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    set.selected ? "border-primary bg-primary" : "border-white/30"
                  }`}>
                    {set.selected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>

                {/* Thumbnail */}
                <div className="w-48 shrink-0">
                  <div className="aspect-video rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-white/20 transition-colors">
                    {set.thumbnail ? (
                      <img src={set.thumbnail} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <>
                        <Image className="w-8 h-8 text-muted-foreground/50" />
                        <span className="text-xs text-muted-foreground">Click to upload</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Title & Set Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-muted-foreground bg-white/10 px-2 py-1 rounded">
                      Set {index + 1}
                    </span>
                    {set.selected && (
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <Input 
                    value={set.title}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateSetTitle(set.id, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Enter video title..."
                    className="text-lg font-medium border-0 bg-transparent p-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/50"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    {set.title.length} characters
                  </p>
                </div>

                {/* Delete Button */}
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSet(set.id);
                  }}
                  disabled={sets.length <= 1}
                  className="text-muted-foreground hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Set Button (alternate) */}
        {sets.length < 5 && (
          <button 
            onClick={addSet}
            className="w-full mt-4 p-4 rounded-xl border-2 border-dashed border-white/10 text-muted-foreground hover:border-white/20 hover:bg-white/[0.02] transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Another Set
          </button>
        )}
      </div>

      {/* Description & Tags */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Description */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Description</h2>
          <Textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Write your video description..."
            className="glass border-white/10 min-h-[180px]"
          />
          <p className="text-sm text-muted-foreground mt-2">
            {description.length} characters
          </p>
        </div>

        {/* Tags & Playlist */}
        <div className="space-y-6">
          {/* Playlist */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <ListVideo className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Playlist</h2>
            </div>
            <div className="flex gap-2">
              <Select 
                value={selectedPlaylist || ""} 
                onValueChange={(v) => setSelectedPlaylist(v || null)}
              >
                <SelectTrigger className="glass border-white/10">
                  <SelectValue placeholder="Select a playlist..." />
                </SelectTrigger>
                <SelectContent>
                  {playlists.map((playlist) => (
                    <SelectItem key={playlist.id} value={playlist.id}>
                      {playlist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                onClick={() => setShowCreatePlaylist(true)}
                className="shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {selectedPlaylist && (
              <button 
                onClick={() => setSelectedPlaylist(null)}
                className="text-xs text-muted-foreground hover:text-white mt-2"
              >
                Remove from playlist
              </button>
            )}
          </div>

          {/* Tags */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4">Tags</h2>
            <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
              {tags.map((tag, i) => (
                <span 
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-sm"
                >
                  #{tag}
                  <button 
                    onClick={() => setTags(tags.filter((_, idx) => idx !== i))}
                    className="opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input 
                placeholder="Add a tag..."
                className="glass border-white/10"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value) {
                    setTags([...tags, e.currentTarget.value]);
                    e.currentTarget.value = "";
                  }
                }}
              />
              <Button variant="outline">Add</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Playlist Dialog */}
      <Dialog open={showCreatePlaylist} onOpenChange={setShowCreatePlaylist}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="playlist-name">Name</Label>
              <Input
                id="playlist-name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="My Awesome Playlist"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="playlist-description">Description (optional)</Label>
              <Textarea
                id="playlist-description"
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
                placeholder="What's this playlist about?"
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