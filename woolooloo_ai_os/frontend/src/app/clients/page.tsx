"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getClients, Client } from "@/lib/clients";

export default function ClientsPage() {
  const clients = useMemo(() => getClients(), []);
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />

      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-display-small text-md-on-surface">Clients</h1>
          <p className="text-body-large text-md-on-surface-variant mt-1">
            Manage client relationships, projects, and engagement
          </p>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            startIcon={<span className="material-symbols-rounded text-20">search</span>}
          />
          <Button variant="filled">
            <span className="material-symbols-rounded text-20 mr-2">add</span>
            Add Client
          </Button>
        </div>

        {/* Client List */}
        <div className="grid gap-4">
          {filtered.map(client => (
            <ClientCard key={client.id} client={client} expanded={selectedClient === client.id} onToggle={() => setSelectedClient(selectedClient === client.id ? null : client.id)} />
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <span className="material-symbols-rounded text-48 text-md-on-surface-variant/40">groups</span>
              <p className="text-body-large text-md-on-surface-variant mt-4">No clients found</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

interface ClientCardProps {
  client: Client;
  expanded: boolean;
  onToggle: () => void;
}

function ClientCard({ client, expanded, onToggle }: ClientCardProps) {
  const totalHours = 0;
  const totalTasks = 0;
  const activeProjects = client.projects.filter(() => true).length;

  return (
    <Card className="hover:shadow-md-2 transition-shadow duration-200">
      <button
        onClick={onToggle}
        className="w-full text-left"
        aria-expanded={expanded}
      >
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="h-12 w-12 rounded-full bg-md-primary-container flex items-center justify-center text-md-on-primary-container text-headline-small font-medium flex-shrink-0">
              {client.name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-title-large text-md-on-surface truncate">{client.name}</h3>
              <p className="text-body-small text-md-on-surface-variant">
                {client.name} · {activeProjects} active projects
              </p>
            </div>

            {/* Stats */}
            <div className="hidden sm:flex items-center gap-6 text-right">
              <div>
                <p className="text-label-medium text-md-on-surface-variant">Projects</p>
                <p className="text-title-medium font-medium text-md-on-surface">{client.projects.length}</p>
              </div>
              <div>
                <p className="text-label-medium text-md-on-surface-variant">Tasks</p>
                <p className="text-title-medium font-medium text-md-on-surface">{totalTasks}</p>
              </div>
              <div>
                <p className="text-label-medium text-md-on-surface-variant">Hours</p>
                <p className="text-title-medium font-medium text-md-on-surface">{totalHours.toFixed(1)}h</p>
              </div>
            </div>

            <span className="material-symbols-rounded text-24 text-md-on-surface-variant">
              {expanded ? "expand_less" : "expand_more"}
            </span>
          </div>
        </CardContent>
      </button>

      {expanded && (
        <div className="border-t border-md-outline-variant/50 px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {client.projects.map(project => (
              <Link
                key={project.id}
                href={`/clients/${client.id}/projects/${project.id}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-md-surface-container hover:bg-md-surface-container-high transition-colors"
              >
                <span className="material-symbols-rounded text-20 text-md-primary">folder</span>
                <div className="flex-1 min-w-0">
                  <p className="text-label-large font-medium text-md-on-surface truncate">{project.name}</p>
                  <p className="text-body-small text-md-on-surface-variant">
                    0h · 0 tasks
                  </p>
                </div>
                <Badge variant="success-tonal">Active</Badge>
              </Link>
            ))}
          </div>

          <div className="flex gap-3 mt-4 pt-4 border-t border-md-outline-variant/50">
            <Link href={`/clients/${client.id}/projects`}>
              <Button variant="text">
                <span className="material-symbols-rounded text-18 mr-1">folder</span>
                View Projects
              </Button>
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}
