"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Settings,
  Trash2,
  Copy
} from "lucide-react";

interface ProjectSettingsPageProps {
  params: Promise<{ studioSlug: string; projectId: string }>;
}

export default function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const { studioSlug, projectId } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("projects")
      .select("notes")
      .eq("id", projectId)
      .single();

    if (data) {
      setNotes(data.notes || "");
    }
    setLoading(false);
  };

  const saveNotes = async () => {
    setSaving(true);
    await supabase
      .from("projects")
      .update({ notes })
      .eq("id", projectId);
    setSaving(false);
  };

  const duplicateProject = async () => {
    // TODO: Implement project duplication
    console.log("Duplicate project not yet implemented");
  };

  const deleteProject = async () => {
    setDeleting(true);
    await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);
    
    // Navigate back to projects list
    router.push(`/studio/${studioSlug}/projects`);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      {/* Project Details */}
      <div className="glass-card p-6 space-y-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Project Settings
        </h2>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Internal Notes</label>
          <Textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this project..."
            className="glass min-h-[100px]"
          />
        </div>

        <Button onClick={saveNotes} disabled={saving} className="glow-sm">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Actions */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Actions</h2>
        
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
          <div>
            <p className="font-medium">Duplicate Project</p>
            <p className="text-sm text-muted-foreground">
              Create a copy of this project
            </p>
          </div>
          <Button variant="outline" onClick={duplicateProject} className="gap-2">
            <Copy className="w-4 h-4" />
            Duplicate
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-card p-6 border-red-500/20 space-y-4">
        <h2 className="text-lg font-semibold text-red-500">Danger Zone</h2>
        
        <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/5 border border-red-500/10">
          <div>
            <p className="font-medium">Delete Project</p>
            <p className="text-sm text-muted-foreground">
              Permanently delete this project and all its data
            </p>
          </div>
          <Button 
            variant="destructive" 
            onClick={() => setShowDeleteDialog(true)}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteProject}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}