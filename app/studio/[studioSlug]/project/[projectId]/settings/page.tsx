import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Settings,
  Calendar,
  Users,
  Trash2,
  Copy
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectSettingsPageProps {
  params: Promise<{ studioSlug: string; projectId: string }>;
}

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const { studioSlug, projectId } = await params;
  const supabase = await createClient();

  // TODO: Fetch project data
  const project = {
    id: projectId,
    title: "Sample Project",
    status: "scripting",
    type: "long",
    due_date: null,
    notes: "",
  };

  const statuses = [
    { value: "idea", label: "Idea" },
    { value: "planning", label: "Planning" },
    { value: "scripting", label: "Scripting" },
    { value: "filming", label: "Filming" },
    { value: "editing", label: "Editing" },
    { value: "review", label: "Review" },
    { value: "scheduled", label: "Scheduled" },
    { value: "published", label: "Published" },
  ];

  const types = [
    { value: "long", label: "Long Form" },
    { value: "short", label: "Short Form" },
  ];

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      {/* Project Details */}
      <div className="glass-card p-6 space-y-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Project Settings
        </h2>

        {/* Title */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Project Title</label>
          <Input 
            defaultValue={project.title}
            className="glass"
          />
        </div>

        {/* Status */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select defaultValue={project.status}>
            <SelectTrigger className="glass">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Video Type</label>
          <Select defaultValue={project.type}>
            <SelectTrigger className="glass">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {types.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Due Date
          </label>
          <Input 
            type="date"
            defaultValue={project.due_date || ""}
            className="glass"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Internal Notes</label>
          <Textarea 
            defaultValue={project.notes}
            placeholder="Add any notes about this project..."
            className="glass min-h-[100px]"
          />
        </div>

        <Button className="glow-sm">Save Changes</Button>
      </div>

      {/* Assignees */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Assignees
        </h2>
        <p className="text-sm text-muted-foreground">
          Assign team members to this project
        </p>
        <Button variant="outline">Add Assignee</Button>
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
          <Button variant="outline" className="gap-2">
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
          <Button variant="destructive" className="gap-2">
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}