"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tv, Film } from "lucide-react";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject: (data: {
    title: string;
    description: string;
    videoType: "long" | "short";
  }) => Promise<void>;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreateProject,
}: CreateProjectDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoType, setVideoType] = useState<"long" | "short">("long");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;

    setCreating(true);
    try {
      await onCreateProject({ title, description, videoType });
      // Reset form
      setTitle("");
      setDescription("");
      setVideoType("long");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating project:", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Create New Project</DialogTitle>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Project Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Awesome Video"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Description (optional)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this video about?"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Video Type</label>
            <div className="flex gap-3">
              <button
                onClick={() => setVideoType("long")}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  videoType === "long"
                    ? "border-primary bg-primary/10"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <Tv className="w-6 h-6 mx-auto mb-2" />
                <p className="font-medium">Long Form</p>
                <p className="text-xs text-muted-foreground">Regular videos</p>
              </button>
              <button
                onClick={() => setVideoType("short")}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  videoType === "short"
                    ? "border-primary bg-primary/10"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <Film className="w-6 h-6 mx-auto mb-2" />
                <p className="font-medium">Short</p>
                <p className="text-xs text-muted-foreground">YouTube Shorts</p>
              </button>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!title.trim() || creating}>
              {creating ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
