"use client";

import { useState, useMemo } from "react";
import { LinearState } from "@/lib/linear";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTasks } from "@/hooks/useTasks";

export default function TasksPage() {
  const { tasks, loading, clients, projects } = useTasks();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "priority" | "project">("date");

  const filtered = useMemo(() => {
    let result = tasks;

    // Filter by status
    if (filter !== "all") {
      result = result.filter(t => {
        if (filter === "active") return (t.state.type as string) !== "completed" && (t.state.type as string) !== "completed";
        if (filter === "done") return t.state.type === "completed";
        if (filter === "overdue") {
          // no dueDate
          return false && (t.state.type as string) !== "completed" && (t.state.type as string) !== "completed";
        }
        return t.state.name.toLowerCase() === filter;
      });
    }

    // Filter by search
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(s) ||
        t.description || "".toLowerCase().includes(s) ||
        t.assigneeName?.toLowerCase().includes(s) ||
        t.projectTitle?.toLowerCase().includes(s)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === "date") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "priority") {
        const order = { Urgent: 0, High: 1, Medium: 2, Low: 3, None: 4 };
        return ((a.priority as unknown as number) ?? 4) - ((b.priority as unknown as number) ?? 4);
      }
      return (a.projectTitle || "").localeCompare(b.projectTitle || "");
    });

    return result;
  }, [tasks, filter, search, sortBy]);

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />

      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-display-small text-md-on-surface">Tasks</h1>
          <p className="text-body-large text-md-on-surface-variant mt-1">
            Manage and track tasks across all Linear projects
          </p>
        </div>

        {/* Filters */}
        <Card variant="tonal" className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                placeholder="Search tasks..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                startIcon={<span className="material-symbols-rounded text-20">search</span>}
              />
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={filter === "all" ? "filled" : "outlined"}
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={filter === "active" ? "filled" : "outlined"}
                  size="sm"
                  onClick={() => setFilter("active")}
                >
                  Active
                </Button>
                <Button
                  variant={filter === "done" ? "filled" : "outlined"}
                  size="sm"
                  onClick={() => setFilter("done")}
                >
                  Done
                </Button>
                <Button
                  variant={filter === "overdue" ? "filled-tonal" : "outlined"}
                  size="sm"
                  onClick={() => setFilter("overdue")}
                >
                  <span className="material-symbols-rounded text-18 mr-1">warning</span>
                  Overdue
                </Button>
              </div>
              <select
                className="rounded-lg border border-md-outline-variant bg-transparent px-4 py-2.5 text-md-on-surface focus:outline-none focus:border-md-primary focus:border-2 min-h-[48px]"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
              >
                <option value="date">Sort by Date</option>
                <option value="priority">Sort by Priority</option>
                <option value="project">Sort by Project</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Task List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{filtered.length} Tasks</CardTitle>
            <Link href="/tasks/new">
              <Button variant="filled">
                <span className="material-symbols-rounded text-20 mr-2">add</span>
                New Task
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <span className="h-8 w-8 animate-spin rounded-full border-4 border-md-primary border-r-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-rounded text-48 text-md-on-surface-variant/40">checklist</span>
                <p className="text-body-large text-md-on-surface-variant mt-4">No tasks found</p>
              </div>
            ) : (
              <div className="divide-y divide-md-outline-variant/50">
                {filtered.map(task => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

interface TaskItemProps {
  task: {
    id: string;
    title: string;
    description?: string;
    state: LinearState;
    priority: string | number;
    projectId: string;
    projectTitle: string;
    projectKey: string;
    assigneeId?: string;
    assigneeName?: string;
    createdAt: string;
    updatedAt: string;
    dueDate?: string;
    identifier?: string;
  };
}

function TaskItem({ task }: TaskItemProps) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.state.type !== "completed";

  const priorityBadge: Record<string, string> = {
    Urgent: "error-tonal",
    High: "warning-tonal",
    Medium: "info-tonal",
    Low: "secondary-tonal",
    None: "secondary-tonal",
  };

  return (
    <Link href={`/tasks/${task.id}`} className="block">
      <div className="flex items-center gap-4 py-4 px-2 hover:bg-md-on-surface/5 transition-colors rounded-lg">
        {/* Checkbox */}
        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          task.state.type === "completed" ? "bg-md-primary border-md-primary" : "border-md-on-surface-variant"
        }`}>
          {task.state.type === "completed" && <span className="material-symbols-rounded text-16 text-md-on-primary">check</span>}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-label-large font-medium truncate ${task.state.type === "completed" ? "line-through text-md-on-surface-variant" : "text-md-on-surface"}`}>
              {task.title}
            </p>
            {task.identifier && (
              <span className="text-body-small text-md-on-surface-variant flex-shrink-0">{task.identifier}</span>
            )}
          </div>
          <p className="text-body-small text-md-on-surface-variant truncate">
            {task.assigneeName || "Unassigned"} · {task.projectTitle || "No project"}
          </p>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {task.priority && task.priority !== "None" && (
            <Badge variant="primary-tonal">{task.priority}</Badge>
          )}
          <Badge variant={isOverdue ? "error-tonal" : task.state.type === "completed" ? "success-tonal" : "primary-tonal"}>
            {task.state.type === "started" ? "Active" : task.state.name}
          </Badge>
          {isOverdue && (
            <Badge variant="error">
              <span className="material-symbols-rounded text-16 mr-1">warning</span>
              Overdue
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
