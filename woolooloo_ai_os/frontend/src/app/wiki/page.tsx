"use client";

import { useState, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { REPO_PROJECTS } from "@/lib/repos";

export default function WikiPage() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const repos = useMemo(() => {
    const items = Object.entries(REPO_PROJECTS);
    if (search) {
      const s = search.toLowerCase();
      return items.filter(([name, info]) =>
        name.toLowerCase().includes(s) ||
        info.description.toLowerCase().includes(s) ||
        info.lang.toLowerCase().includes(s)
      );
    }
    return items;
  }, [search]);

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />

      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-display-small text-md-on-surface">Wiki</h1>
          <p className="text-body-large text-md-on-surface-variant mt-1">
            GitHub repository documentation and project knowledge base
          </p>
        </div>

        <Card variant="tonal" className="mb-6">
          <CardContent className="pt-6">
            <Input
              placeholder="Search repositories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              startIcon={<span className="material-symbols-rounded text-20">search</span>}
            />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {repos.map(([name, info]) => (
            <Card key={name} className="hover:shadow-md-2 transition-shadow">
              <button
                onClick={() => setExpanded(expanded === name ? null : name)}
                className="w-full text-left"
                aria-expanded={expanded === name}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-md-primary-container flex items-center justify-center">
                      <span className="material-symbols-rounded text-24 text-md-on-primary-container">code</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-title-large text-md-on-surface truncate">{name}</h3>
                      <p className="text-body-small text-md-on-surface-variant truncate">{info.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="secondary-tonal">{info.lang}</Badge>
                      <span className="material-symbols-rounded text-24 text-md-on-surface-variant">
                        {expanded === name ? "expand_less" : "expand_more"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </button>

              {expanded === name && (
                <div className="border-t border-md-outline-variant/50 px-6 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-label-small text-md-on-surface-variant">Branch</p>
                      <p className="text-label-large text-md-on-surface">{info.branch}</p>
                    </div>
                    <div>
                      <p className="text-label-small text-md-on-surface-variant">Language</p>
                      <p className="text-label-large text-md-on-surface">{info.lang}</p>
                    </div>
                    <div>
                      <p className="text-label-small text-md-on-surface-variant">Project</p>
                      <p className="text-label-large text-md-on-surface">{info.project}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <a
                      href={`https://github.com/The-Woolooloo-Company/${name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-md-secondary-container text-md-on-secondary-container text-label-medium font-medium hover:bg-opacity-90 transition-colors"
                    >
                      <span className="material-symbols-rounded text-18">open_in_new</span>
                      Open on GitHub
                    </a>
                  </div>
                </div>
              )}
            </Card>
          ))}

          {repos.length === 0 && (
            <div className="text-center py-12">
              <span className="material-symbols-rounded text-48 text-md-on-surface-variant/40">auto_stories</span>
              <p className="text-body-large text-md-on-surface-variant mt-4">No repositories found</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
