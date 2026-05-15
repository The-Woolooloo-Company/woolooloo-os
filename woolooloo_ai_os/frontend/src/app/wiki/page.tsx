"use client";

import { useState, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { REPO_PROJECTS } from "@/lib/repos";
import { WIKI_NOTES } from "@/lib/wiki-notes";

type WikiTab = "all" | "github" | "obsidian";

const TABS: { id: WikiTab; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "grid_view" },
  { id: "github", label: "GitHub", icon: "code" },
  { id: "obsidian", label: "Obsidian", icon: "article" },
];

export default function WikiPage() {
  const [tab, setTab] = useState<WikiTab>("all");
  const [search, setSearch] = useState("");
  const [expandedRepo, setExpandedRepo] = useState<string | null>(null);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  const filteredRepos = useMemo(() => {
    const items = Object.entries(REPO_PROJECTS);
    if (search) {
      const s = search.toLowerCase();
      return items.filter(([name, info]) =>
        name.toLowerCase().includes(s) ||
        info.description.toLowerCase().includes(s) ||
        info.lang.toLowerCase().includes(s) ||
        info.project.toLowerCase().includes(s)
      );
    }
    return items;
  }, [search]);

  const filteredNotes = useMemo(() => {
    if (search) {
      const s = search.toLowerCase();
      return WIKI_NOTES.filter(
        (n) =>
          n.title.toLowerCase().includes(s) ||
          n.description.toLowerCase().includes(s) ||
          n.tags.some((t) => t.toLowerCase().includes(s)) ||
          (n.project && n.project.toLowerCase().includes(s))
      );
    }
    return WIKI_NOTES;
  }, [search]);

  const repoCount = filteredRepos.length;
  const noteCount = filteredNotes.length;

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />

      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-display-small text-md-on-surface">Wiki</h1>
          <p className="text-body-large text-md-on-surface-variant mt-1">
            Project documentation, repositories, and knowledge base
          </p>
        </div>

        {/* Search + Tabs Row */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <Card variant="tonal">
            <CardContent className="pt-6">
              <Input
                placeholder="Search everything..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                startIcon={
                  <span className="material-symbols-rounded text-20">search</span>
                }
              />
            </CardContent>
          </Card>

          {/* MD3 Tabs */}
          <div className="flex gap-1 p-1 bg-md-surface-container-lowest rounded-2xl max-w-md">
            {TABS.map((t) => {
              const count =
                t.id === "all"
                  ? repoCount + noteCount
                  : t.id === "github"
                    ? repoCount
                    : noteCount;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`
                    flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-label-large transition-all duration-200
                    ${active
                      ? "bg-md-primary text-md-on-primary shadow-md-1"
                      : "text-md-on-surface-variant hover:bg-md-surface-container hover:text-md-on-surface"
                    }
                  `}
                  aria-pressed={active}
                >
                  <span className="material-symbols-rounded text-18">{t.icon}</span>
                  <span>{t.label}</span>
                  <span
                    className={`
                      flex items-center justify-center h-5 min-w-5 px-1.5 text-[11px] font-semibold rounded-full
                      ${active
                        ? "bg-white/20 text-md-on-primary"
                        : "bg-md-surface-container-high text-md-on-surface-variant"
                      }
                    `}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="grid gap-4">
          {/* GitHub Repos */}
          {(tab === "all" || tab === "github") && filteredRepos.map(([name, info]) => (
            <Card key={name} className="hover:shadow-md-2 transition-shadow">
              <button
                onClick={() => setExpandedRepo(expandedRepo === name ? null : name)}
                className="w-full text-left"
                aria-expanded={expandedRepo === name}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-md-primary-container flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-rounded text-24 text-md-on-primary-container">code</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-title-large text-md-on-surface truncate">{name}</h3>
                        <Badge variant="secondary-tonal" className="flex-shrink-0">{info.lang}</Badge>
                      </div>
                      <p className="text-body-small text-md-on-surface-variant truncate">{info.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="secondary-outlined" className="text-[10px]">GitHub</Badge>
                      <span className="material-symbols-rounded text-24 text-md-on-surface-variant">
                        {expandedRepo === name ? "expand_less" : "expand_more"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </button>

              {expandedRepo === name && (
                <div className="border-t border-md-outline-variant/50 px-6 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-label-small text-md-on-surface-variant">Project</p>
                      <p className="text-label-large text-md-on-surface">{info.project}</p>
                    </div>
                    <div>
                      <p className="text-label-small text-md-on-surface-variant">Client</p>
                      <p className="text-label-large text-md-on-surface">{info.client}</p>
                    </div>
                    <div>
                      <p className="text-label-small text-md-on-surface-variant">Branch</p>
                      <p className="text-label-large text-md-on-surface">{info.branch}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <a
                      href={info.url}
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

          {/* Obsidian Wiki Notes */}
          {(tab === "all" || tab === "obsidian") && filteredNotes.map((note) => (
            <Card key={note.slug} className="hover:shadow-md-2 transition-shadow">
              <button
                onClick={() => setExpandedNote(expandedNote === note.slug ? null : note.slug)}
                className="w-full text-left"
                aria-expanded={expandedNote === note.slug}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-md-secondary-container flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-rounded text-24 text-md-on-secondary-container">article</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-title-large text-md-on-surface truncate">{note.title}</h3>
                        {note.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="tertiary-tonal" className="text-[10px]">{tag}</Badge>
                        ))}
                      </div>
                      <p className="text-body-small text-md-on-surface-variant truncate">{note.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="secondary-outlined" className="text-[10px]">Obsidian</Badge>
                      <span className="material-symbols-rounded text-24 text-md-on-surface-variant">
                        {expandedNote === note.slug ? "expand_less" : "expand_more"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </button>

              {expandedNote === note.slug && (
                <div className="border-t border-md-outline-variant/50 px-6 py-4">
                  {note.project && (
                    <div className="flex items-center gap-4 mb-4">
                      {note.project && (
                        <div>
                          <p className="text-label-small text-md-on-surface-variant">Project</p>
                          <p className="text-label-large text-md-on-surface">{note.project}</p>
                        </div>
                      )}
                      {note.client && (
                        <div>
                          <p className="text-label-small text-md-on-surface-variant">Client</p>
                          <p className="text-label-large text-md-on-surface">{note.client}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="prose prose-sm max-w-none text-body-medium">
                    {note.content.split("\n").map((line, i) => {
                      if (line.startsWith("# ")) {
                        return <h2 key={i} className="text-title-large font-semibold mt-3 mb-1 text-md-on-surface">{line.replace(/^# /, "")}</h2>;
                      }
                      if (line.startsWith("## ")) {
                        return <h3 key={i} className="text-title-medium font-semibold mt-2 mb-1 text-md-on-surface">{line.replace(/^## /, "")}</h3>;
                      }
                      if (line.startsWith("- ")) {
                        return <li key={i} className="ml-4 list-disc text-md-on-surface">{line.replace(/^- /, "")}</li>;
                      }
                      if (line.startsWith("```")) return null;
                      if (line.match(/`/)) {
                        return (
                          <p key={i} className="text-md-on-surface">
                            {line.split(/`([^`]+)`/).map((part, j) =>
                              j % 2 === 1 ? (
                                <code key={j} className="bg-md-surface-container-high px-1.5 py-0.5 rounded text-label-medium text-md-on-surface-variant">{part}</code>
                              ) : part
                            )}
                          </p>
                        );
                      }
                      return line.trim() ? <p key={i} className="text-md-on-surface">{line}</p> : null;
                    })}
                  </div>
                </div>
              )}
            </Card>
          ))}

          {/* Empty States */}
          {tab === "github" && filteredRepos.length === 0 && (
            <div className="text-center py-16">
              <span className="material-symbols-rounded text-48 text-md-on-surface-variant/40">code_off</span>
              <p className="text-body-large text-md-on-surface-variant mt-4">
                {search ? "No repositories match your search" : "No GitHub repositories configured"}
              </p>
            </div>
          )}
          {tab === "obsidian" && filteredNotes.length === 0 && (
            <div className="text-center py-16">
              <span className="material-symbols-rounded text-48 text-md-on-surface-variant/40">article</span>
              <p className="text-body-large text-md-on-surface-variant mt-4">
                {search ? "No wiki notes match your search" : "No Obsidian wiki notes yet"}
              </p>
              <p className="text-body-medium text-md-on-surface-variant/60 mt-1">
                Add entries in <code className="bg-md-surface-container-high px-1.5 py-0.5 rounded text-label-medium">lib/wiki-notes.ts</code> or connect your Obsidian vault
              </p>
            </div>
          )}
          {tab === "all" && filteredRepos.length === 0 && filteredNotes.length === 0 && (
            <div className="text-center py-16">
              <span className="material-symbols-rounded text-48 text-md-on-surface-variant/40">auto_stories</span>
              <p className="text-body-large text-md-on-surface-variant mt-4">Nothing matches your search</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
