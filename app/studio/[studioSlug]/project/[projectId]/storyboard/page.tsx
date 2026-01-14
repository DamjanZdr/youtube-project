"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Trash2,
  Clock,
  FileText,
  Image,
  Loader2,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Timer,
  RotateCcw,
} from "lucide-react";

interface Scene {
  id: string;
  script_text: string;
  visual_notes: string;
  position: number;
  duration_seconds: number | null; // null = auto-calculate
}

interface Script {
  id: string;
  title: string;
  content: string | null;
  word_count: number;
  estimated_duration: number;
}

// Calculate duration from word count (150 words per minute)
const calcAutoDuration = (text: string): number => {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.ceil((words / 150) * 60); // seconds
};

// Format seconds to mm:ss
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function StoryboardPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const [script, setScript] = useState<Script | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [editingDurationId, setEditingDurationId] = useState<string | null>(null);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const durationInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [projectId]);

  useEffect(() => {
    if (editingDurationId && durationInputRef.current) {
      durationInputRef.current.focus();
      durationInputRef.current.select();
    }
  }, [editingDurationId]);

  const loadData = async () => {
    setLoading(true);

    // First, check if a script exists for this project
    let { data: existingScript } = await supabase
      .from("scripts")
      .select("*")
      .eq("project_id", projectId)
      .single();

    // If no script exists, create one
    if (!existingScript) {
      const { data: newScript } = await supabase
        .from("scripts")
        .insert({ project_id: projectId, title: "Script" })
        .select()
        .single();
      existingScript = newScript;
    }

    if (existingScript) {
      setScript(existingScript);

      // Load scenes for this script
      const { data: scenesData } = await supabase
        .from("scenes")
        .select("*")
        .eq("script_id", existingScript.id)
        .order("position");

      if (scenesData && scenesData.length > 0) {
        setScenes(scenesData);
      } else {
        // Create initial scene
        const { data: newScene } = await supabase
          .from("scenes")
          .insert({
            script_id: existingScript.id,
            script_text: "",
            visual_notes: "",
            position: 0,
            duration_seconds: null,
          })
          .select()
          .single();
        
        if (newScene) setScenes([newScene]);
      }
    }

    setLoading(false);
  };

  // Auto-save with debounce
  const scheduleSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveAllScenes();
    }, 1000);
  };

  const saveAllScenes = async () => {
    if (!script) return;
    setSaving(true);

    // Update all scenes
    for (const scene of scenes) {
      await supabase
        .from("scenes")
        .update({
          script_text: scene.script_text,
          visual_notes: scene.visual_notes,
          position: scene.position,
          duration_seconds: scene.duration_seconds,
        })
        .eq("id", scene.id);
    }

    // Update script word count and total duration
    const totalWords = scenes.reduce(
      (acc, s) => acc + s.script_text.split(/\s+/).filter(Boolean).length,
      0
    );
    const totalDuration = scenes.reduce(
      (acc, s) => acc + getSceneDuration(s),
      0
    );

    await supabase
      .from("scripts")
      .update({
        word_count: totalWords,
        estimated_duration: Math.ceil(totalDuration / 60),
      })
      .eq("id", script.id);

    setLastSaved(new Date());
    setSaving(false);
  };

  // Get scene duration (manual or auto-calculated)
  const getSceneDuration = (scene: Scene): number => {
    if (scene.duration_seconds !== null) {
      return scene.duration_seconds;
    }
    return calcAutoDuration(scene.script_text);
  };

  const updateSceneDuration = (id: string, seconds: number | null) => {
    setScenes(scenes.map((s) => (s.id === id ? { ...s, duration_seconds: seconds } : s)));
    scheduleSave();
  };

  const addScene = async () => {
    if (!script) return;

    const position = scenes.length;
    const { data: newScene } = await supabase
      .from("scenes")
      .insert({
        script_id: script.id,
        script_text: "",
        visual_notes: "",
        position,
        duration_seconds: null,
      })
      .select()
      .single();

    if (newScene) {
      setScenes([...scenes, newScene]);
    }
  };

  const removeScene = async (id: string) => {
    if (scenes.length <= 1) return;

    setScenes(scenes.filter((s) => s.id !== id));
    await supabase.from("scenes").delete().eq("id", id);
  };

  const updateScene = (id: string, field: "script_text" | "visual_notes", value: string) => {
    setScenes(scenes.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    scheduleSave();
  };

  const moveScene = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= scenes.length) return;

    const newScenes = [...scenes];
    const temp = newScenes[index];
    newScenes[index] = newScenes[newIndex];
    newScenes[newIndex] = temp;

    // Update positions
    newScenes.forEach((scene, i) => {
      scene.position = i;
    });

    setScenes(newScenes);
    scheduleSave();
  };

  // Calculate stats
  const totalWords = scenes.reduce(
    (acc, s) => acc + s.script_text.split(/\s+/).filter(Boolean).length,
    0
  );
  const totalDurationSeconds = scenes.reduce(
    (acc, s) => acc + getSceneDuration(s),
    0
  );

  if (loading) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header Stats */}
      <div className="px-8 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Words:</span>
            <span className="font-medium">{totalWords.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Duration:</span>
            <span className="font-medium">{formatDuration(totalDurationSeconds)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Scenes:</span>
            <span className="font-medium">{scenes.length}</span>
          </div>

          {/* Save Status */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : lastSaved ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span>Saved</span>
              </>
            ) : null}
          </div>
        </div>
        <Button onClick={addScene} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Scene
        </Button>
      </div>

      {/* Column Headers */}
      <div className="px-8 py-3 border-b border-white/5 grid grid-cols-[auto_1fr_1fr_auto] gap-4 shrink-0">
        <div className="w-16" />
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FileText className="w-4 h-4" />
          Script
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Image className="w-4 h-4" />
          Editing Notes
        </div>
        <div className="w-10" />
      </div>

      {/* Scenes */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-4">
          {scenes.map((scene, index) => (
            <div key={scene.id} className="glass-card p-4 group">
              <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4">
                {/* Scene Number & Reorder */}
                <div className="flex flex-col items-center gap-1 pt-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => moveScene(index, "up")}
                    disabled={index === 0}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <span className="text-xs font-medium text-muted-foreground bg-white/5 px-2 py-1 rounded">
                    {index + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => moveScene(index, "down")}
                    disabled={index === scenes.length - 1}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>

                {/* Script Column */}
                <div>
                  <Textarea
                    value={scene.script_text}
                    onChange={(e) => updateScene(scene.id, "script_text", e.target.value)}
                    placeholder="Write your script here... What will you say in this scene?"
                    className="min-h-[150px] glass border-white/10 resize-none"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {scene.script_text.split(/\s+/).filter(Boolean).length} words
                    </p>
                    {/* Duration control */}
                    <div className="flex items-center gap-2">
                      <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                      {editingDurationId === scene.id ? (
                        <input
                          ref={durationInputRef}
                          type="text"
                          defaultValue={formatDuration(getSceneDuration(scene))}
                          onBlur={(e) => {
                            const parts = e.target.value.split(":");
                            let seconds = 0;
                            if (parts.length === 2) {
                              seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                            } else if (parts.length === 1) {
                              seconds = parseInt(parts[0]);
                            }
                            if (!isNaN(seconds) && seconds > 0) {
                              updateSceneDuration(scene.id, seconds);
                            }
                            setEditingDurationId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            } else if (e.key === "Escape") {
                              setEditingDurationId(null);
                            }
                          }}
                          className="w-14 text-xs text-center bg-white/10 border border-white/20 rounded px-1.5 py-0.5 focus:outline-none focus:border-primary"
                          placeholder="0:00"
                        />
                      ) : (
                        <button
                          onClick={() => setEditingDurationId(scene.id)}
                          className={`text-xs px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors ${
                            scene.duration_seconds !== null ? "text-primary" : "text-muted-foreground"
                          }`}
                          title={scene.duration_seconds !== null ? "Manual duration (click to edit)" : "Auto duration (click to set manually)"}
                        >
                          {formatDuration(getSceneDuration(scene))}
                        </button>
                      )}
                      {scene.duration_seconds !== null && (
                        <button
                          onClick={() => updateSceneDuration(scene.id, null)}
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="Reset to auto-calculate"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Visual Column */}
                <div>
                  <Textarea
                    value={scene.visual_notes}
                    onChange={(e) => updateScene(scene.id, "visual_notes", e.target.value)}
                    placeholder="Visual cues, B-roll ideas, graphics, sound effects..."
                    className="min-h-[150px] glass border-white/10 resize-none bg-blue-500/5"
                  />
                </div>

                {/* Delete Button */}
                <div className="pt-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeScene(scene.id)}
                    disabled={scenes.length <= 1}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Add Scene Button */}
          <button
            onClick={addScene}
            className="w-full p-6 rounded-xl border-2 border-dashed border-white/10 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Scene
          </button>
        </div>
      </div>
    </div>
  );
}