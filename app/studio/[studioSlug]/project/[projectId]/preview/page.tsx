"use client";

import { use, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { PreviewControls, PreviewArea } from "./_sections";
import { usePreviewState } from "./_hooks";
import type { PackagingSet, Channel, YouTubeVideo } from "./_components";

interface PreviewPageProps {
  params: Promise<{ studioSlug: string; projectId: string }>;
}

async function fetchPackagingSets(projectId: string): Promise<PackagingSet[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("packaging_sets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function fetchChannel(projectId: string): Promise<Channel | null> {
  const supabase = createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("channel_id")
    .eq("id", projectId)
    .single();

  if (!project?.channel_id) return null;

  const { data: channel } = await supabase
    .from("channels")
    .select("*")
    .eq("id", project.channel_id)
    .single();

  return channel;
}

async function fetchVideoType(projectId: string): Promise<string> {
  const supabase = createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("video_type")
    .eq("id", projectId)
    .single();

  return project?.video_type || "long";
}

async function searchYouTubeVideos(query: string, videoDuration?: 'short' | 'medium' | 'long'): Promise<YouTubeVideo[]> {
  if (!query) return [];
  
  let url = `/api/youtube-search?q=${encodeURIComponent(query)}&maxResults=10`;
  if (videoDuration) {
    url += `&videoDuration=${videoDuration}`;
  }
  
  const response = await fetch(url);
  
  if (!response.ok) return [];
  const data = await response.json();
  return data.videos || [];
}

export default function PreviewPage({ params }: PreviewPageProps) {
  const { projectId } = use(params);
  const state = usePreviewState();
  const lastFetchedRef = useRef<string | null>(null);

  const { data: sets = [] } = useQuery({
    queryKey: ["packaging-sets", projectId],
    queryFn: () => fetchPackagingSets(projectId),
    staleTime: 0, // Always consider data stale
    refetchOnMount: true, // Refetch when component mounts
  });

  const { data: channel } = useQuery({
    queryKey: ["channel", projectId],
    queryFn: () => fetchChannel(projectId),
    staleTime: 0, // Always consider data stale
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when user comes back to tab
  });

  const { data: videoType = "long" } = useQuery({
    queryKey: ["video-type", projectId],
    queryFn: () => fetchVideoType(projectId),
    staleTime: 0, // Always consider data stale
    refetchOnMount: true, // Refetch when component mounts
  });

  const currentSet = sets[state.currentSetIndex];

  // Fetch compare videos only when compare mode is turned ON (not when already on)
  useEffect(() => {
    const fetchCompareVideos = async () => {
      // Only fetch if compare mode is on AND we haven't fetched yet (or it was turned off and on again)
      if (state.compareMode && currentSet?.title && lastFetchedRef.current !== currentSet.title) {
        // Fetch both long-form and shorts separately
        const [longVideos, shortVideos] = await Promise.all([
          searchYouTubeVideos(currentSet.title, 'medium'), // medium = 4-20 minutes (long-form)
          searchYouTubeVideos(currentSet.title, 'short')   // short = < 60 seconds
        ]);
        state.setCompareVideos(longVideos);
        state.setCompareShorts(shortVideos);
        lastFetchedRef.current = currentSet.title;
      } else if (!state.compareMode) {
        // Reset the ref when compare is turned off, so next turn-on will fetch fresh
        lastFetchedRef.current = null;
        // Keep videos until turned off - don't clear them
      }
    };
    fetchCompareVideos();
  }, [state.compareMode, currentSet?.title, state.setCompareVideos, state.setCompareShorts]);

  // Clear compare videos when compare mode is turned off
  useEffect(() => {
    if (!state.compareMode) {
      state.setCompareVideos([]);
      state.setCompareShorts([]);
    }
  }, [state.compareMode, state.setCompareVideos, state.setCompareShorts]);

  if (!sets.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">No packaging sets found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <PreviewControls
        sets={sets}
        currentSetIndex={state.currentSetIndex}
        onSetChange={state.setCurrentSetIndex}
        orientation={state.orientation}
        onOrientationChange={state.setOrientation}
        previewMode={state.previewMode}
        onPreviewModeChange={state.setPreviewMode}
        compareMode={state.compareMode}
        onCompareModeChange={state.setCompareMode}
      />
      <div className="flex-1 min-h-0">
        <PreviewArea
          set={currentSet}
          channel={channel || { name: "Your Channel", avatar_url: null } as any}
          orientation={state.orientation}
          previewMode={state.previewMode}
          compareMode={state.compareMode}
          compareVideos={state.compareVideos}
          compareShorts={state.compareShorts}
          videoType={videoType}
        />
      </div>
    </div>
  );
}
