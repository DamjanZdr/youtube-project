"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  X,
  User,
} from "lucide-react";

interface BoardStatus {
  id: string;
  name: string;
  color: string;
  position: number;
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

export default function TasksPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const studioSlug = params.studioSlug as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statuses, setStatuses] = useState<BoardStatus[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [newTaskText, setNewTaskText] = useState<Record<string, string>>({});
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [currentStatusId, setCurrentStatusId] = useState<string | null>(null);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [projectAssignees, setProjectAssignees] = useState<ProjectAssignee[]>([]);
  const [projectStatusDetails, setProjectStatusDetails] = useState<ProjectStatusDetail[]>([]);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);

    // Get project organization, due date and current status
    const { data: project } = await supabase
      .from("projects")
      .select("organization_id, due_date, board_status_id")
      .eq("id", projectId)
      .single();

    if (!project) {
      setLoading(false);
      return;
    }

    setDueDate(project.due_date);
    setCurrentStatusId(project.board_status_id);

    // Load all data in parallel
    const [statusesRes, tasksRes, membersRes, assigneesRes, statusDetailsRes] = await Promise.all([
      supabase
        .from("board_statuses")
        .select("*")
        .eq("organization_id", project.organization_id)
        .order("position"),
      supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("position"),
      supabase
        .from("organization_members")
        .select("id, user_id, role, profile:profiles(id, full_name, avatar_url)")
        .eq("organization_id", project.organization_id),
      supabase
        .from("project_assignees")
        .select("*")
        .eq("project_id", projectId),
      supabase
        .from("project_status_details")
        .select("*")
        .eq("project_id", projectId),
    ]);

    if (statusesRes.data) setStatuses(statusesRes.data);
    if (tasksRes.data) setTasks(tasksRes.data);
    if (membersRes.data) setOrgMembers(membersRes.data as unknown as OrgMember[]);
    if (assigneesRes.data) setProjectAssignees(assigneesRes.data);
    if (statusDetailsRes.data) setProjectStatusDetails(statusDetailsRes.data);

    setLoading(false);
  };

  const updateDueDate = async (newDate: string | null) => {
    setDueDate(newDate);
    await supabase
      .from("projects")
      .update({ due_date: newDate })
      .eq("id", projectId);
  };

  const updateStatus = async (newStatusId: string) => {
    setCurrentStatusId(newStatusId);
    await supabase
      .from("projects")
      .update({ board_status_id: newStatusId })
      .eq("id", projectId);
  };

  // Project Assignee functions
  const getProjectAssignee = () => {
    const assignment = projectAssignees.find(a => a.project_id === projectId);
    if (!assignment) return null;
    return orgMembers.find(m => m.user_id === assignment.user_id) || null;
  };

  const updateProjectAssignee = async (userId: string | null) => {
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

  // Status detail functions
  const getStatusDetail = (statusId: string) => {
    return projectStatusDetails.find(d => d.project_id === projectId && d.status_id === statusId);
  };

  const updateStatusAssignee = async (statusId: string, userId: string | null) => {
    const existing = getStatusDetail(statusId);

    if (existing) {
      await supabase
        .from("project_status_details")
        .update({ assignee_id: userId })
        .eq("id", existing.id);

      setProjectStatusDetails(projectStatusDetails.map(d =>
        d.id === existing.id ? { ...d, assignee_id: userId } : d
      ));
    } else if (userId) {
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

  const updateStatusDueDate = async (statusId: string, dueDateValue: string | null) => {
    const existing = getStatusDetail(statusId);

    if (existing) {
      await supabase
        .from("project_status_details")
        .update({ due_date: dueDateValue })
        .eq("id", existing.id);

      setProjectStatusDetails(projectStatusDetails.map(d =>
        d.id === existing.id ? { ...d, due_date: dueDateValue } : d
      ));
    } else if (dueDateValue) {
      const { data } = await supabase
        .from("project_status_details")
        .insert({ project_id: projectId, status_id: statusId, due_date: dueDateValue })
        .select()
        .single();

      if (data) {
        setProjectStatusDetails([...projectStatusDetails, data]);
      }
    }
  };

  const toggleTaskComplete = async (taskId: string, completed: boolean) => {
    setTasks(tasks.map(t => 
      t.id === taskId 
        ? { ...t, is_completed: completed } 
        : t
    ));

    await supabase
      .from("project_tasks")
      .update({ 
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq("id", taskId);
  };

  const addTask = async (statusId: string) => {
    const taskName = newTaskText[statusId]?.trim();
    if (!taskName) return;

    setSaving(true);
    
    const statusTasks = tasks.filter(t => t.status_id === statusId);
    const position = statusTasks.length;

    const { data, error } = await supabase
      .from("project_tasks")
      .insert({
        project_id: projectId,
        status_id: statusId,
        name: taskName,
        position,
      })
      .select()
      .single();

    if (data && !error) {
      setTasks([...tasks, data]);
      setNewTaskText({ ...newTaskText, [statusId]: "" });
    }

    setSaving(false);
  };

  const removeTask = async (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    await supabase.from("project_tasks").delete().eq("id", taskId);
  };

  const getTasksForStatus = (statusId: string) => {
    return tasks.filter(t => t.status_id === statusId);
  };

  const getCompletionStats = (statusId: string) => {
    const statusTasks = getTasksForStatus(statusId);
    const completed = statusTasks.filter(t => t.is_completed).length;
    return { completed, total: statusTasks.length };
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div>
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Project Tasks</h2>
            <p className="text-sm text-muted-foreground">
              Track your progress through each stage
            </p>
          </div>
          
          <div className="flex items-end gap-4">
            {/* Status Selector */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Status</label>
              <Select
                value={currentStatusId || ""}
                onValueChange={updateStatus}
              >
                <SelectTrigger className="w-fit h-9 bg-white/5 border-white/10 text-sm gap-2">
                  <SelectValue>
                    {(() => {
                      const currentStatus = statuses.find(s => s.id === currentStatusId);
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

          {/* Project Assignee */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Project Assignee</label>
            <Select
              value={getProjectAssignee()?.user_id || "unassigned"}
              onValueChange={(value) => updateProjectAssignee(value === "unassigned" ? null : value)}
            >
              <SelectTrigger className="w-fit h-9 bg-white/5 border-white/10 text-sm gap-2">
                <SelectValue>
                  {(() => {
                    const assignee = getProjectAssignee();
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
                    return (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>Unassigned</span>
                      </div>
                    );
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

          {/* Due Date */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Project Due Date</label>
            <div className="relative w-36">
              <input
                type="date"
                value={dueDate?.split('T')[0] || ''}
                onChange={(e) => updateDueDate(e.target.value || null)}
                className="w-full px-3 py-1.5 pr-8 rounded-lg bg-white/5 border border-white/10 focus:border-primary focus:outline-none text-sm h-9 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                placeholder="Set due date"
              />
              {dueDate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateDueDate(null);
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid layout - 5 columns */}
      <div className="grid grid-cols-5 gap-3">
        {statuses.map((status) => {
          const statusTasks = getTasksForStatus(status.id);
          const { completed, total } = getCompletionStats(status.id);
          const statusDetail = getStatusDetail(status.id);
          const statusAssignee = statusDetail?.assignee_id 
            ? orgMembers.find(m => m.user_id === statusDetail.assignee_id)
            : null;

          return (
            <div 
              key={status.id} 
              className="flex flex-col bg-white/[0.02] rounded-xl border border-white/5"
            >
              {/* Column Header */}
              <div className="p-3 border-b border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${status.color}`} />
                  <span className="font-medium text-sm flex-1 truncate">{status.name}</span>
                  {total > 0 && (
                    <span className={`text-xs ${completed === total ? 'text-green-400' : 'text-muted-foreground'}`}>
                      {completed}/{total}
                    </span>
                  )}
                </div>
                
                {/* Status Assignee & Due Date */}
                <div className="flex items-center gap-2">
                  {/* Status Assignee */}
                  <Select
                    value={statusDetail?.assignee_id || "unassigned"}
                    onValueChange={(value) => updateStatusAssignee(status.id, value === "unassigned" ? null : value)}
                  >
                    <SelectTrigger className="flex-1 h-7 text-xs bg-transparent border-white/10">
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
                      onChange={(e) => updateStatusDueDate(status.id, e.target.value || null)}
                      className="w-full px-2 py-1 pr-6 rounded bg-transparent border border-white/10 focus:border-primary focus:outline-none text-xs h-7 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    {statusDetail?.due_date && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatusDueDate(status.id, null);
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Add Task Input */}
              <div className="px-2 pt-2">
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newTaskText[status.id] || ""}
                    onChange={(e) => setNewTaskText({ ...newTaskText, [status.id]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addTask(status.id);
                      }
                    }}
                    placeholder="Add task..."
                    className="flex-1 px-2 py-1.5 rounded bg-white/5 border border-white/10 focus:border-primary focus:outline-none text-xs min-w-0"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => addTask(status.id)}
                    disabled={!newTaskText[status.id]?.trim() || saving}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Tasks */}
              <div className="flex-1 p-2 space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
                {statusTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground/50 text-center py-4">
                    No tasks
                  </p>
                ) : (
                  statusTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/5 group"
                    >
                      <Checkbox
                        checked={task.is_completed}
                        onCheckedChange={(checked) => toggleTaskComplete(task.id, !!checked)}
                        className="h-4 w-4 mt-0.5 shrink-0 rounded-none border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-black"
                      />
                      <span className={`flex-1 text-sm leading-tight break-words ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                        {task.name}
                      </span>
                      <button
                        onClick={() => removeTask(task.id)}
                        className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {statuses.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No board statuses configured yet.
          </p>
          <Button variant="outline" asChild>
            <a href={`/studio/${studioSlug}/board`}>Go to Board Settings</a>
          </Button>
        </div>
      )}
      </div>
    </div>
  );
}