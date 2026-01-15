"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Plus, 
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  User,
} from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BoardStatus {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  position: number;
}

interface StatusDefaultTask {
  id: string;
  status_id: string;
  name: string;
  position: number;
}

interface Project {
  id: string;
  title: string;
  board_status_id: string | null;
  thumbnail_url: string | null;
  due_date: string | null;
  video_type: "long" | "short";
  active_set_title?: string | null;
  active_set_thumbnail?: string | null;
}

interface ProjectTask {
  id: string;
  project_id: string;
  status_id: string | null;
  name: string;
  is_completed: boolean;
  position: number;
}

interface OrgMember {
  id: string;
  user_id: string;
  role: string;
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface ProjectStatusDetail {
  id: string;
  project_id: string;
  status_id: string;
  assignee_id: string | null;
  due_date: string | null;
}

interface ProjectAssignee {
  id: string;
  project_id: string;
  user_id: string;
}

const colorOptions = [
  { name: "Purple", value: "bg-purple-500" },
  { name: "Blue", value: "bg-blue-500" },
  { name: "Cyan", value: "bg-cyan-500" },
  { name: "Green", value: "bg-green-500" },
  { name: "Yellow", value: "bg-yellow-500" },
  { name: "Orange", value: "bg-orange-500" },
  { name: "Red", value: "bg-red-500" },
  { name: "Pink", value: "bg-pink-500" },
  { name: "Indigo", value: "bg-indigo-500" },
  { name: "Gray", value: "bg-gray-500" },
];

const defaultStatusList = [
  { name: "Idea", color: "bg-purple-500" },
  { name: "Package", color: "bg-orange-500" },
  { name: "Script", color: "bg-blue-500" },
  { name: "Record", color: "bg-yellow-500" },
  { name: "Edit", color: "bg-pink-500" },
  { name: "Review", color: "bg-cyan-500" },
  { name: "Complete", color: "bg-green-500" },
];

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.studioSlug as string;

  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<BoardStatus[]>([]);
  const [defaultTasks, setDefaultTasks] = useState<StatusDefaultTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<ProjectTask[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [projectStatusDetails, setProjectStatusDetails] = useState<ProjectStatusDetail[]>([]);
  const [projectAssignees, setProjectAssignees] = useState<ProjectAssignee[]>([]);
  
  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editingStatusName, setEditingStatusName] = useState("");
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [expandedStatusTasks, setExpandedStatusTasks] = useState<string | null>(null);
  const [newTaskInput, setNewTaskInput] = useState("");
  
  // Task popup state
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showTaskPopup, setShowTaskPopup] = useState(false);
  const [collapsedStatuses, setCollapsedStatuses] = useState<Set<string>>(new Set());
  const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [studioSlug]);

  const loadData = async () => {
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

    setOrganizationId(org.id);

    // Load statuses, default tasks, and projects
    const [statusesRes, projectsRes] = await Promise.all([
      supabase
        .from("board_statuses")
        .select("*")
        .eq("organization_id", org.id)
        .order("position"),
      supabase
        .from("projects")
        .select(`
          id,
          title,
          board_status_id,
          thumbnail_url,
          due_date,
          video_type,
          packaging_sets (
            title,
            thumbnail_url,
            is_selected
          )
        `)
        .eq("organization_id", org.id),
    ]);

    const statusList = statusesRes.data || [];
    setStatuses(statusList);

    // Load default tasks for all statuses
    if (statusList.length > 0) {
      const { data: tasksData } = await supabase
        .from("status_default_tasks")
        .select("*")
        .in("status_id", statusList.map(s => s.id))
        .order("position");
      
      console.log("Loaded default tasks:", tasksData);
      setDefaultTasks(tasksData || []);
    }

    // Map projects with active set data
    if (projectsRes.data) {
      const firstStatusId = statusList[0]?.id || null;
      const mappedProjects = projectsRes.data.map((p: any) => {
        const activeSet = p.packaging_sets?.find((s: any) => s.is_selected);
        return {
          id: p.id,
          title: p.title,
          // Auto-assign to first status if unassigned
          board_status_id: p.board_status_id || firstStatusId,
          thumbnail_url: p.thumbnail_url,
          due_date: p.due_date,
          video_type: p.video_type,
          active_set_title: activeSet?.title || null,
          active_set_thumbnail: activeSet?.thumbnail_url || null,
        };
      });
      
      // Update any unassigned projects in DB to first status
      const unassigned = projectsRes.data.filter((p: any) => !p.board_status_id);
      if (unassigned.length > 0 && firstStatusId) {
        for (const p of unassigned) {
          supabase.from("projects").update({ board_status_id: firstStatusId }).eq("id", p.id);
        }
      }
      
      setProjects(mappedProjects);

      // Load tasks for all projects
      const projectIds = mappedProjects.map((p: Project) => p.id);
      if (projectIds.length > 0) {
        const [tasksRes, statusDetailsRes, assigneesRes] = await Promise.all([
          supabase
            .from("project_tasks")
            .select("*")
            .in("project_id", projectIds)
            .order("position"),
          supabase
            .from("project_status_details")
            .select("*")
            .in("project_id", projectIds),
          supabase
            .from("project_assignees")
            .select("*")
            .in("project_id", projectIds),
        ]);

        if (tasksRes.data) {
          setAllTasks(tasksRes.data);
        }
        if (statusDetailsRes.data) {
          setProjectStatusDetails(statusDetailsRes.data);
        }
        if (assigneesRes.data) {
          setProjectAssignees(assigneesRes.data);
        }
      }
    }

    // Load organization members
    const { data: membersData } = await supabase
      .from("organization_members")
      .select(`
        id,
        user_id,
        role,
        profile:profiles!organization_members_user_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq("organization_id", org.id);

    if (membersData) {
      setOrgMembers(membersData as unknown as OrgMember[]);
    }

    setLoading(false);
  };

  // Setup default statuses manually
  const setupDefaultStatuses = async () => {
    if (!organizationId) return;

    // Use the database function to create statuses with default tasks
    await supabase.rpc('create_default_board_statuses', { org_id: organizationId });

    // Reload the page to fetch new statuses
    window.location.reload();
  };

  // Status management functions
  const addStatus = async () => {
    if (!organizationId) return;

    const newStatus = {
      organization_id: organizationId,
      name: "New Status",
      color: "bg-gray-500",
      position: statuses.length,
    };

    const { data } = await supabase
      .from("board_statuses")
      .insert(newStatus)
      .select()
      .single();

    if (data) {
      setStatuses([...statuses, data]);
      setEditingStatusId(data.id);
      setEditingStatusName(data.name);
    }
  };

  const updateStatusName = async (id: string) => {
    if (!editingStatusName.trim()) return;
    
    setStatuses(statuses.map(s => s.id === id ? { ...s, name: editingStatusName } : s));
    setEditingStatusId(null);

    await supabase
      .from("board_statuses")
      .update({ name: editingStatusName })
      .eq("id", id);
  };

  const updateStatusColor = async (id: string, color: string) => {
    setStatuses(statuses.map(s => s.id === id ? { ...s, color } : s));
    setShowColorPicker(null);

    await supabase
      .from("board_statuses")
      .update({ color })
      .eq("id", id);
  };

  const moveStatus = async (id: string, direction: number) => {
    const currentIndex = statuses.findIndex(s => s.id === id);
    const newIndex = currentIndex + direction;
    
    if (newIndex < 0 || newIndex >= statuses.length) return;
    
    const newStatuses = [...statuses];
    const [moved] = newStatuses.splice(currentIndex, 1);
    newStatuses.splice(newIndex, 0, moved);
    
    // Update positions
    const updatedStatuses = newStatuses.map((s, i) => ({ ...s, position: i }));
    setStatuses(updatedStatuses);
    
    // Update in DB
    for (const s of updatedStatuses) {
      await supabase.from("board_statuses").update({ position: s.position }).eq("id", s.id);
    }
  };

  const deleteStatus = async (id: string) => {
    // Move all projects in this status to first remaining status
    const remainingStatuses = statuses.filter(s => s.id !== id);
    const firstStatusId = remainingStatuses[0]?.id || null;
    
    const projectsInStatus = projects.filter(p => p.board_status_id === id);
    for (const p of projectsInStatus) {
      await supabase.from("projects").update({ board_status_id: firstStatusId }).eq("id", p.id);
    }
    setProjects(projects.map(p => p.board_status_id === id ? { ...p, board_status_id: firstStatusId } : p));

    // Delete default tasks
    await supabase.from("status_default_tasks").delete().eq("status_id", id);
    setDefaultTasks(defaultTasks.filter(t => t.status_id !== id));

    // Delete status
    await supabase.from("board_statuses").delete().eq("id", id);
    setStatuses(statuses.filter(s => s.id !== id));
  };

  const addDefaultTask = async (statusId: string) => {
    if (!newTaskInput.trim()) return;

    const statusTasks = defaultTasks.filter(t => t.status_id === statusId);
    const { data } = await supabase
      .from("status_default_tasks")
      .insert({
        status_id: statusId,
        name: newTaskInput.trim(),
        position: statusTasks.length,
      })
      .select()
      .single();

    if (data) {
      setDefaultTasks([...defaultTasks, data]);
      setNewTaskInput("");
    }
  };

  const deleteDefaultTask = async (taskId: string) => {
    await supabase.from("status_default_tasks").delete().eq("id", taskId);
    setDefaultTasks(defaultTasks.filter(t => t.id !== taskId));
  };

  const moveProject = async (projectId: string, newStatusId: string) => {
    // Optimistic update
    setProjects(projects.map(p => 
      p.id === projectId ? { ...p, board_status_id: newStatusId } : p
    ));

    await supabase
      .from("projects")
      .update({ board_status_id: newStatusId })
      .eq("id", projectId);

    // Add default tasks for the new status if project doesn't have them
    const statusDefaultTasks = defaultTasks.filter(t => t.status_id === newStatusId);
    if (statusDefaultTasks.length > 0) {
      const existingTasks = allTasks.filter(t => t.project_id === projectId);
      const existingNames = new Set(existingTasks.map(t => t.name.toLowerCase()));

      const tasksToAdd = statusDefaultTasks
        .filter(dt => !existingNames.has(dt.name.toLowerCase()))
        .map((dt, i) => ({
          project_id: projectId,
          status_id: newStatusId,
          name: dt.name,
          position: existingTasks.length + i,
        }));

      if (tasksToAdd.length > 0) {
        const { data: newTasks } = await supabase
          .from("project_tasks")
          .insert(tasksToAdd)
          .select();

        if (newTasks) {
          setAllTasks([...allTasks, ...newTasks]);
        }
      }
    }
  };

  const getProjectsForStatus = (statusId: string) => {
    return projects.filter(p => p.board_status_id === statusId);
  };

  const getTasksForProject = (projectId: string) => {
    return allTasks.filter(t => t.project_id === projectId);
  };

  const getTaskCompletionForProject = (projectId: string) => {
    const tasks = getTasksForProject(projectId);
    const completed = tasks.filter(t => t.is_completed).length;
    return { completed, total: tasks.length };
  };

  const getTaskCompletionForStatus = (projectId: string, statusId: string) => {
    const tasks = allTasks.filter(t => t.project_id === projectId && t.status_id === statusId);
    const completed = tasks.filter(t => t.is_completed).length;
    return { completed, total: tasks.length };
  };

  const toggleTaskComplete = async (taskId: string, completed: boolean) => {
    setAllTasks(allTasks.map(t => 
      t.id === taskId ? { ...t, is_completed: completed } : t
    ));

    await supabase
      .from("project_tasks")
      .update({ 
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq("id", taskId);
  };

  const updateProjectDueDate = async (projectId: string, dueDate: string | null) => {
    setProjects(projects.map(p => 
      p.id === projectId ? { ...p, due_date: dueDate } : p
    ));
    if (selectedProject?.id === projectId) {
      setSelectedProject({ ...selectedProject, due_date: dueDate });
    }

    await supabase
      .from("projects")
      .update({ due_date: dueDate })
      .eq("id", projectId);
  };

  const getProjectAssignee = (projectId: string) => {
    const assignment = projectAssignees.find(a => a.project_id === projectId);
    if (!assignment) return null;
    return orgMembers.find(m => m.user_id === assignment.user_id) || null;
  };

  const updateProjectAssignee = async (projectId: string, userId: string | null) => {
    // Remove existing assignment
    const existing = projectAssignees.find(a => a.project_id === projectId);
    if (existing) {
      await supabase.from("project_assignees").delete().eq("id", existing.id);
      setProjectAssignees(projectAssignees.filter(a => a.id !== existing.id));
    }

    // Add new assignment
    if (userId) {
      const { data } = await supabase
        .from("project_assignees")
        .insert({ project_id: projectId, user_id: userId })
        .select()
        .single();

      if (data) {
        setProjectAssignees([...projectAssignees.filter(a => a.project_id !== projectId), data]);
      }
    }
  };

  const getStatusDetail = (projectId: string, statusId: string) => {
    return projectStatusDetails.find(d => d.project_id === projectId && d.status_id === statusId);
  };

  const updateStatusAssignee = async (projectId: string, statusId: string, userId: string | null) => {
    const existing = getStatusDetail(projectId, statusId);

    if (existing) {
      // Update existing
      await supabase
        .from("project_status_details")
        .update({ assignee_id: userId })
        .eq("id", existing.id);

      setProjectStatusDetails(projectStatusDetails.map(d =>
        d.id === existing.id ? { ...d, assignee_id: userId } : d
      ));
    } else if (userId) {
      // Create new
      const { data } = await supabase
        .from("project_status_details")
        .insert({ project_id: projectId, status_id: statusId, assignee_id: userId })
        .select()
        .single();

      if (data) {
        setProjectStatusDetails([...projectStatusDetails, data]);
      }
    }
  };

  const updateStatusDueDate = async (projectId: string, statusId: string, dueDate: string | null) => {
    const existing = getStatusDetail(projectId, statusId);

    if (existing) {
      // Update existing
      await supabase
        .from("project_status_details")
        .update({ due_date: dueDate })
        .eq("id", existing.id);

      setProjectStatusDetails(projectStatusDetails.map(d =>
        d.id === existing.id ? { ...d, due_date: dueDate } : d
      ));
    } else if (dueDate) {
      // Create new
      const { data } = await supabase
        .from("project_status_details")
        .insert({ project_id: projectId, status_id: statusId, due_date: dueDate })
        .select()
        .single();

      if (data) {
        setProjectStatusDetails([...projectStatusDetails, data]);
      }
    }
  };

  const openTaskPopup = (project: Project) => {
    setSelectedProject(project);
    setShowTaskPopup(true);
    // Collapse all statuses except the current one
    const collapsed = new Set(statuses.filter(s => s.id !== project.board_status_id).map(s => s.id));
    setCollapsedStatuses(collapsed);
  };

  const getTasksByStatus = (projectId: string) => {
    const projectTasks = getTasksForProject(projectId);
    const grouped: Record<string, ProjectTask[]> = {};
    
    statuses.forEach(s => {
      grouped[s.id] = projectTasks.filter(t => t.status_id === s.id);
    });
    
    // Also include tasks without a status
    grouped["uncategorized"] = projectTasks.filter(t => !t.status_id);
    
    return grouped;
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-0px)] flex flex-col relative">
      {/* Page Header */}
      <div className="p-6 pb-4 shrink-0">
        <h1 className="text-3xl font-bold">Board</h1>
        <p className="text-muted-foreground mt-1">
          Visual overview of your content pipeline
        </p>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-xl border border-white/10 shadow-lg">
        <Button 
          variant={editMode ? "default" : "ghost"} 
          size="sm"
          onClick={() => setEditMode(!editMode)}
          className="rounded-full"
        >
          <Pencil className="w-4 h-4 mr-2" />
          {editMode ? "Done" : "Edit"}
        </Button>
        <div className="w-px h-6 bg-white/10" />
        <Button size="sm" className="rounded-full glow-sm" asChild>
          <Link href={`/studio/${studioSlug}/projects`}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto px-6 pb-20">
        {/* Empty state when no statuses */}
        {statuses.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No board statuses yet</h3>
              <p className="text-muted-foreground mb-6">
                Set up your workflow by creating statuses for your kanban board, or use our recommended defaults.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button onClick={setupDefaultStatuses} className="glow-sm">
                  Use Default Statuses
                </Button>
                <Button variant="outline" onClick={addStatus}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Custom
                </Button>
              </div>
            </div>
          </div>
        ) : (
        <div className="flex gap-3 h-full min-w-max">
          {/* Status Columns */}
          {statuses.map((status) => (
            <div 
              key={status.id} 
              className={`w-56 flex flex-col bg-white/[0.02] rounded-2xl border transition-colors ${
                dragOverStatusId === status.id 
                  ? 'border-primary/50 bg-primary/5' 
                  : 'border-white/5'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverStatusId(status.id);
              }}
              onDragLeave={(e) => {
                // Only clear if leaving the column entirely
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverStatusId(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const projectId = e.dataTransfer.getData("projectId");
                if (projectId) {
                  moveProject(projectId, status.id);
                }
                setDragOverStatusId(null);
              }}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-white/5">
                {/* Top row: color, name, count */}
                <div className="flex items-center gap-2">
                  {/* Color dot with picker */}
                  <div className="relative">
                    <button
                      onClick={() => editMode && setShowColorPicker(showColorPicker === status.id ? null : status.id)}
                      className={`w-3 h-3 rounded-full ${status.color} ${editMode ? 'cursor-pointer hover:scale-125 transition-transform' : ''}`}
                      disabled={!editMode}
                    />
                    {showColorPicker === status.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(null)} />
                        <div className="absolute left-0 top-5 flex flex-wrap gap-1 p-2 bg-background border border-white/10 rounded-lg z-50 w-32">
                          {colorOptions.map((color) => (
                            <button
                              key={color.value}
                              onClick={() => updateStatusColor(status.id, color.value)}
                              className={`w-5 h-5 rounded-full ${color.value} hover:scale-110 transition-transform ${status.color === color.value ? 'ring-2 ring-white' : ''}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Status name - editable in edit mode */}
                  {editingStatusId === status.id ? (
                    <Input
                      value={editingStatusName}
                      onChange={(e) => setEditingStatusName(e.target.value)}
                      onBlur={() => updateStatusName(status.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") updateStatusName(status.id);
                        if (e.key === "Escape") setEditingStatusId(null);
                      }}
                      className="h-6 px-1 text-sm font-semibold flex-1 min-w-0"
                      autoFocus
                    />
                  ) : (
                    <h3 
                      className={`font-semibold text-sm truncate flex-1 ${editMode ? 'cursor-pointer hover:text-primary' : ''}`}
                      onClick={() => {
                        if (editMode) {
                          setEditingStatusId(status.id);
                          setEditingStatusName(status.name);
                        }
                      }}
                    >
                      {status.name}
                    </h3>
                  )}
                  
                  <span className="text-xs text-muted-foreground shrink-0">
                    {getProjectsForStatus(status.id).length}
                  </span>
                </div>

                {/* Edit mode controls - second row */}
                {editMode && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => moveStatus(status.id, -1)}
                        disabled={statuses.findIndex(s => s.id === status.id) === 0}
                      >
                        ← Left
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => moveStatus(status.id, 1)}
                        disabled={statuses.findIndex(s => s.id === status.id) === statuses.length - 1}
                      >
                        Right →
                      </Button>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => setExpandedStatusTasks(expandedStatusTasks === status.id ? null : status.id)}
                        title="Default tasks"
                      >
                        {expandedStatusTasks === status.id ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteStatus(status.id)}
                        title="Delete status"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Default Tasks Editor (in edit mode) */}
              {editMode && expandedStatusTasks === status.id && (
                <div className="px-3 py-3 border-b border-white/5 bg-white/[0.02]">
                  <p className="text-xs text-muted-foreground mb-2">Default tasks for this status:</p>
                  <div className="space-y-1.5">
                    {defaultTasks.filter(t => t.status_id === status.id).map((task) => (
                      <div key={task.id} className="flex items-center gap-2 text-sm bg-white/5 rounded px-2 py-1">
                        <span className="flex-1 truncate">{task.name}</span>
                        <button
                          onClick={() => deleteDefaultTask(task.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <Input
                        value={newTaskInput}
                        onChange={(e) => setNewTaskInput(e.target.value)}
                        placeholder="Add default task..."
                        className="h-7 text-xs"
                        onKeyDown={(e) => e.key === "Enter" && addDefaultTask(status.id)}
                      />
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => addDefaultTask(status.id)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                {getProjectsForStatus(status.id).map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    statuses={statuses}
                    currentStatusId={status.id}
                    onMoveToStatus={moveProject}
                    onOpenTasks={() => openTaskPopup(project)}
                    taskCompletion={getTaskCompletionForStatus(project.id, status.id)}
                  />
                ))}

                {getProjectsForStatus(status.id).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-muted-foreground/50">No items</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Add Status Column (in edit mode) */}
          {editMode && (
            <button
              onClick={addStatus}
              className="w-56 flex flex-col items-center justify-center bg-white/[0.02] rounded-2xl border border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.04] transition-colors"
            >
              <Plus className="w-6 h-6 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Add Status</span>
            </button>
          )}
        </div>
        )}
      </div>

      {/* Task Popup Dialog */}
      <Dialog open={showTaskPopup} onOpenChange={setShowTaskPopup}>
        <DialogContent className="sm:max-w-[90vw] lg:max-w-[750px] w-[95vw] h-[90vh] sm:h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogTitle className="sr-only">
            {selectedProject?.active_set_title || selectedProject?.title || "Project Tasks"}
          </DialogTitle>
          {selectedProject && (
            <div className="flex flex-col h-full">
              {/* Top Section - Project Info */}
              <div className="shrink-0 border-b border-white/10 p-6">
                <div className="flex gap-6 justify-between">
                  {/* Left: Image stacked above Title */}
                  <div className="shrink-0 min-w-0">
                    {(selectedProject.active_set_thumbnail || selectedProject.thumbnail_url) && (
                      <div className="w-[45vw] sm:w-64 lg:w-80 max-w-80 aspect-video rounded-lg overflow-hidden bg-white/5 mb-3">
                        <img 
                          src={selectedProject.active_set_thumbnail || selectedProject.thumbnail_url || ""} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <h3 className="font-semibold text-base sm:text-lg leading-tight max-w-[45vw] sm:max-w-64 lg:max-w-80">
                      {selectedProject.active_set_title || selectedProject.title || "Untitled"}
                    </h3>
                    {/* Status Selector */}
                    <div className="mt-3">
                      <Select
                        value={selectedProject.board_status_id || ""}
                        onValueChange={(value) => {
                          moveProject(selectedProject.id, value);
                          setSelectedProject({ ...selectedProject, board_status_id: value });
                        }}
                      >
                        <SelectTrigger className="w-fit h-8 bg-white/5 border-white/10 text-sm gap-2">
                          <SelectValue>
                            {(() => {
                              const currentStatus = statuses.find(s => s.id === selectedProject.board_status_id);
                              return currentStatus ? (
                                <div className="flex items-center gap-2">
                                  <div className={`w-2.5 h-2.5 rounded-full ${currentStatus.color}`} />
                                  <span>{currentStatus.name}</span>
                                </div>
                              ) : <span className="text-muted-foreground">No status</span>;
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((status) => (
                            <SelectItem key={status.id} value={status.id}>
                              <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${status.color}`} />
                                <span>{status.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Right: Project Assignee, Due Date, and Open Button */}
                  <div className="flex flex-col items-start shrink-0">
                    {/* Project Assignee and Due Date stacked */}
                    <div className="w-40 sm:w-44 lg:w-48 space-y-3">
                      {/* Project Assignee */}
                      <div>
                        <label className="text-xs text-muted-foreground mb-1.5 block">Project Assignee</label>
                        <Select
                          value={getProjectAssignee(selectedProject.id)?.user_id || "unassigned"}
                          onValueChange={(value) => updateProjectAssignee(selectedProject.id, value === "unassigned" ? null : value)}
                        >
                          <SelectTrigger className="w-full h-9 bg-white/5 border-white/10">
                            <SelectValue>
                              {(() => {
                                const assignee = getProjectAssignee(selectedProject.id);
                                if (assignee) {
                                  return (
                                    <div className="flex items-center gap-2">
                                      {assignee.profile.avatar_url ? (
                                        <img src={assignee.profile.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                                      ) : (
                                        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                                          <User className="w-3 h-3" />
                                        </div>
                                      )}
                                      <span className="truncate">{assignee.profile.full_name || 'Unknown'}</span>
                                    </div>
                                  );
                                }
                                return <span className="text-muted-foreground">Unassigned</span>;
                              })()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {orgMembers.map((member) => (
                              <SelectItem key={member.user_id} value={member.user_id}>
                                <div className="flex items-center gap-2">
                                  {member.profile.avatar_url ? (
                                    <img src={member.profile.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                                      <User className="w-3 h-3" />
                                    </div>
                                  )}
                                  <span>{member.profile.full_name || 'Unknown'}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Project Due Date */}
                      <div>
                        <label className="text-xs text-muted-foreground mb-1.5 block">Project Due Date</label>
                        <div className="relative">
                          <input
                            type="date"
                            value={selectedProject.due_date?.split('T')[0] || ''}
                            onChange={(e) => updateProjectDueDate(selectedProject.id, e.target.value || null)}
                            className="w-full px-3 py-1.5 pr-8 rounded-lg bg-white/5 border border-white/10 focus:border-primary focus:outline-none text-sm h-9 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                          />
                          {selectedProject.due_date && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateProjectDueDate(selectedProject.id, null);
                              }}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Open Project Button */}
                      <div>
                        <label className="text-xs text-muted-foreground mb-1.5 block">&nbsp;</label>
                        <Button asChild size="sm" variant="outline" className="w-full h-9">
                          <Link href={`/studio/${studioSlug}/project/${selectedProject.id}/tasks`}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Open Project
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section - Status Tasks */}
              <div className="flex-1 overflow-y-auto p-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Tasks by Status</h4>
                <div className="space-y-3">
                  {statuses.map((status) => {
                    const statusTasks = getTasksByStatus(selectedProject.id)[status.id] || [];
                    const isCollapsed = collapsedStatuses.has(status.id);
                    const completed = statusTasks.filter(t => t.is_completed).length;
                    const isCurrentStatus = status.id === selectedProject.board_status_id;
                    const statusDetail = getStatusDetail(selectedProject.id, status.id);
                    const statusAssignee = statusDetail?.assignee_id 
                      ? orgMembers.find(m => m.user_id === statusDetail.assignee_id)
                      : null;

                    return (
                      <div key={status.id} className={`border rounded-lg overflow-hidden ${isCurrentStatus ? 'border-white/20 bg-white/[0.02]' : 'border-white/10'}`}>
                        {/* Status Header */}
                        <div className="flex items-center justify-between p-3 hover:bg-white/5">
                          <button
                            onClick={() => {
                              const newCollapsed = new Set(collapsedStatuses);
                              if (newCollapsed.has(status.id)) {
                                newCollapsed.delete(status.id);
                              } else {
                                newCollapsed.add(status.id);
                              }
                              setCollapsedStatuses(newCollapsed);
                            }}
                            className="flex items-center gap-2 flex-1"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                            <div className={`w-2.5 h-2.5 rounded-full ${status.color}`} />
                            <span className="font-medium">{status.name}</span>
                            {isCurrentStatus && (
                              <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-muted-foreground">Current</span>
                            )}
                            <span className={`text-sm ml-2 ${completed === statusTasks.length && statusTasks.length > 0 ? 'text-green-400' : 'text-muted-foreground'}`}>
                              {completed}/{statusTasks.length}
                            </span>
                          </button>

                          {/* Status Assignee and Due Date */}
                          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                            {/* Status Assignee */}
                            <Select
                              value={statusDetail?.assignee_id || "unassigned"}
                              onValueChange={(value) => updateStatusAssignee(selectedProject.id, status.id, value === "unassigned" ? null : value)}
                            >
                              <SelectTrigger className="w-32 h-7 text-xs bg-transparent border-white/10">
                                <SelectValue>
                                  {statusAssignee ? (
                                    <div className="flex items-center gap-1.5">
                                      {statusAssignee.profile.avatar_url ? (
                                        <img src={statusAssignee.profile.avatar_url} alt="" className="w-4 h-4 rounded-full" />
                                      ) : (
                                        <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center">
                                          <User className="w-2.5 h-2.5" />
                                        </div>
                                      )}
                                      <span className="truncate">{statusAssignee.profile.full_name?.split(' ')[0] || 'Unknown'}</span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">Assignee</span>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {orgMembers.map((member) => (
                                  <SelectItem key={member.user_id} value={member.user_id}>
                                    <div className="flex items-center gap-2">
                                      {member.profile.avatar_url ? (
                                        <img src={member.profile.avatar_url} alt="" className="w-4 h-4 rounded-full" />
                                      ) : (
                                        <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center">
                                          <User className="w-2.5 h-2.5" />
                                        </div>
                                      )}
                                      <span>{member.profile.full_name || 'Unknown'}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Status Due Date */}
                            <div className="relative w-28">
                              <input
                                type="date"
                                value={statusDetail?.due_date || ''}
                                onChange={(e) => updateStatusDueDate(selectedProject.id, status.id, e.target.value || null)}
                                className="w-full px-2 py-1 pr-6 rounded bg-transparent border border-white/10 focus:border-primary focus:outline-none text-xs h-7 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                              />
                              {statusDetail?.due_date && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateStatusDueDate(selectedProject.id, status.id, null);
                                  }}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-white"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Task List */}
                        {!isCollapsed && (
                          <div className="px-3 pb-3 space-y-1">
                            {statusTasks.length > 0 ? (
                              statusTasks.map((task) => (
                                <div key={task.id} className="flex items-center gap-3 py-2 pl-6">
                                  <Checkbox
                                    checked={task.is_completed}
                                    onCheckedChange={(checked) => toggleTaskComplete(task.id, !!checked)}
                                    className="h-5 w-5 rounded-none border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-black"
                                  />
                                  <span className={`${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                                    {task.name}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="pl-6 py-2 text-sm text-muted-foreground/50">
                                No tasks for this status
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Project Card Component
function ProjectCard({
  project,
  statuses,
  currentStatusId,
  onMoveToStatus,
  onOpenTasks,
  taskCompletion,
}: {
  project: Project;
  statuses: BoardStatus[];
  currentStatusId: string;
  onMoveToStatus: (projectId: string, statusId: string) => void;
  onOpenTasks: () => void;
  taskCompletion: { completed: number; total: number };
}) {
  const displayTitle = project.active_set_title || project.title;
  const displayThumbnail = project.active_set_thumbnail || project.thumbnail_url;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("projectId", project.id);
    e.dataTransfer.effectAllowed = "move";
    // Add a slight delay to show dragging state
    setTimeout(() => {
      (e.target as HTMLElement).style.opacity = "0.5";
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = "1";
  };

  return (
    <div
      className="glass-card p-3 cursor-grab hover:border-white/20 transition-colors group relative active:cursor-grabbing"
      onClick={onOpenTasks}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Thumbnail */}
      {displayThumbnail && (
        <div className="aspect-video rounded-lg overflow-hidden mb-2 bg-white/5">
          <img src={displayThumbnail} alt="" className="w-full h-full object-cover pointer-events-none" />
        </div>
      )}

      {/* Title */}
      <h4 className="font-medium text-sm line-clamp-2 mb-2">
        {displayTitle || "Untitled"}
      </h4>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Task Progress */}
        {taskCompletion.total > 0 && (
          <span className={`text-xs ${taskCompletion.completed === taskCompletion.total ? 'text-green-400' : 'text-muted-foreground'}`}>
            {taskCompletion.completed}/{taskCompletion.total} tasks
          </span>
        )}

        {/* Due Date */}
        {project.due_date && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{new Date(project.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </div>
        )}
      </div>
    </div>
  );
}