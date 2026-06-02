"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAllProjects, ClientProject, Client, seedMockClients } from "@/lib/clients";
import { useToast } from "@/components/toast";

const KEY = 'woolooloo-staging';
const DOM = 'woolooloo.tech';
const API = 'http://192.168.1.72:9091';

// Known active deployments (seed if localStorage is empty)
const KNOWN_DEPLOYMENTS: Entry[] = [
  {
    projectId: 'woolooloo-os', projectName: 'Woolooloo OS', clientName: 'Woolooloo',
    subdomain: 'os', url: `https://os.${DOM}`, status: 'live',
    tunnel: false, target: '192.168.1.161', repo: 'The-Woolooloo-Company/woolooloo-os', port: 3000,
  },
  {
    projectId: 'nc-pam', projectName: 'NCM Spectrum', clientName: 'Netcore',
    subdomain: 'ncm', url: `https://ncm.${DOM}`, status: 'live',
    tunnel: false, target: '192.168.1.161', repo: 'The-Woolooloo-Company/ncm-spectrum', port: 3101,
  },
];

interface Entry {
  projectId: string;
  projectName: string;
  clientName: string;
  subdomain: string;
  url: string;
  status: 'idle' | 'deploying' | 'live' | 'error';
  lastDeploy?: string;
  tunnel: boolean;
  target: string;
  repo: string;
  port: number;
}

function load(): Entry[] {
  if (typeof window === 'undefined') return [];
  try {
    const d = localStorage.getItem(KEY);
    const saved = d ? JSON.parse(d) : [];
    // If localStorage is empty, seed with known deployments
    if (saved.length === 0 && KNOWN_DEPLOYMENTS.length > 0) {
      save(KNOWN_DEPLOYMENTS);
      return KNOWN_DEPLOYMENTS;
    }
    return saved;
  } catch { return []; }
}
function save(d: Entry[]) { if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify(d)); }

export default function Page() {
  const { showToast } = useToast();
  const [items, setItems] = useState<{ project: ClientProject; client: Client }[]>([]);
  const [entries, setData] = useState<Entry[]>([]);
  const [editItem, setEditItem] = useState<{ project: ClientProject; client: Client } | null>(null);
  const [sub, setSub] = useState('');
  const [tun, setTun] = useState(true);
  const [target, setTarget] = useState('192.168.1.161');
  const [repo, setRepo] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [cfStatus, setCfStatus] = useState<'checking' | 'ok' | 'down'>('checking');

  useEffect(() => {
    seedMockClients();
    setItems(getAllProjects());
    setData(load());
    checkCF();
  }, []);

  const checkCF = async () => {
    try {
      const r = await fetch(`${API}/health`, { signal: AbortSignal.timeout(3000) });
      setCfStatus(r.ok ? 'ok' : 'down');
    } catch { setCfStatus('down'); }
  };

  const findEntry = (id: string) => entries.find(e => e.projectId === id);

  const openEdit = (p: ClientProject, c: Client) => {
    setEditItem({ project: p, client: c });
    const ex = findEntry(p.id);
    setSub(ex?.subdomain || p.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8));
    setTun(ex?.tunnel ?? true);
    setTarget(ex?.target || '192.168.1.161');
    setRepo(ex?.repo || (p.githubRepos?.[0] || ''));
  };

  const doSave = () => {
    if (!editItem) return;
    const { project, client } = editItem;
    const url = `https://${sub}.${DOM}`;
    const ex = findEntry(project.id);
    const entry: Entry = {
      projectId: project.id, projectName: project.name, clientName: client.name,
      subdomain: sub, url, status: ex?.status || 'idle', lastDeploy: ex?.lastDeploy,
      tunnel: tun, target: target, repo: repo, port: ex?.port || 0,
    };
    const updated = entries.filter(e => e.projectId !== project.id);
    updated.push(entry);
    setData(updated); save(updated);
    setEditItem(null);
    showToast(`${project.name} staged → ${url}`, "success");
  };

  const doDeploy = async (entry: Entry) => {
    setBusy(entry.projectId);
    setData(prev => prev.map(x => x.projectId === entry.projectId ? { ...x, status: 'deploying' } : x));
    showToast(`Deploying ${entry.projectName} (${entry.repo})...`, "info");

    try {
      const res = await fetch(`${API}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: entry.subdomain,
          repo: entry.repo,
          target: entry.target,
        }),
        signal: AbortSignal.timeout(120000),
      });
      const data = await res.json();

      if (data.ok) {
        setData(prev => prev.map(x => x.projectId === entry.projectId ? { ...x, status: 'live', lastDeploy: new Date().toISOString(), port: data.port } : x));
        showToast(`${entry.projectName} deployed!`, "success");
      } else {
        throw new Error(data.error || 'Deploy failed');
      }
    } catch (e: any) {
      setData(prev => prev.map(x => x.projectId === entry.projectId ? { ...x, status: 'error' } : x));
      showToast(`Deploy failed: ${e.message}`, "error");
    } finally {
      setBusy(null);
    }
  };

  const doTest = (url: string) => {
    // Open in new tab so browser resolves Cloudflare DNS
    window.open(url, '_blank');
    showToast(`Opened ${url} in new tab — check status there`, "info");
  };

  const doUndeploy = async (entry: Entry) => {
    try {
      const res = await fetch(`${API}/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: entry.subdomain }),
      });
      const data = await res.json();
      if (data.ok) {
        setData(prev => prev.filter(e => e.projectId !== entry.projectId));
        showToast(`${entry.projectName} removed`, "success");
      }
    } catch (e: any) { showToast(`Undeploy failed: ${e.message}`, "error"); }
  };

  if (!items.length) return <div className="min-h-screen bg-md-surface flex items-center justify-center"><span className="h-8 w-8 animate-spin rounded-full border-4 border-md-primary border-r-transparent" /></div>;

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />
      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-display-small text-md-on-surface">Staging</h1>
            <p className="text-body-large text-md-on-surface-variant mt-1">Deploy project previews via *.{DOM}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${cfStatus === 'ok' ? 'bg-green-500' : cfStatus === 'down' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`} />
            <Button variant="tonal" onClick={checkCF}>
              <span className="material-symbols-rounded text-18 mr-1">dns</span>
              Cloudflared
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Projects', value: items.length },
            { label: 'Configured', value: entries.length },
            { label: 'Live', value: entries.filter(e => e.status === 'live').length },
            { label: 'Tunnels', value: entries.filter(e => e.tunnel).length },
          ].map((s, i) => (
            <Card key={i}><CardContent className="pt-6">
              <p className="text-headline-medium text-md-on-surface">{s.value}</p>
              <p className="text-label-medium text-md-on-surface-variant">{s.label}</p>
            </CardContent></Card>
          ))}
        </div>

        {/* Projects */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(({ project, client }) => {
            const entry = findEntry(project.id);
            return (
              <Card key={project.id} className="hover:shadow-md-1 transition-shadow">
                <CardHeader>
                  <CardTitle className="text-title-large">{project.name}</CardTitle>
                  <CardDescription>{client.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  {entry ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <a href={entry.url} target="_blank" rel="noreferrer" className="text-body-medium text-md-primary hover:underline truncate">{entry.url}</a>
                        <Badge variant={entry.status === 'live' ? 'success-tonal' : entry.status === 'deploying' ? 'warning-tonal' : 'secondary-tonal'}>{entry.status}</Badge>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {entry.tunnel && <Badge variant="primary-tonal"><span className="material-symbols-rounded text-14 mr-1">cloud</span>Tunnel</Badge>}
                        <Badge variant="secondary-outlined">→ {entry.target}:{entry.port}</Badge>
                        {entry.repo && <Badge variant="secondary-tonal"><span className="material-symbols-rounded text-14 mr-1">code</span>{entry.repo.split('/').pop()}</Badge>}
                      </div>
                      {entry.lastDeploy && <p className="text-body-small text-md-on-surface-variant">Deployed: {new Date(entry.lastDeploy).toLocaleString()}</p>}
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="tonal" size="sm" onClick={() => doDeploy(entry)} disabled={busy === entry.projectId}>
                          <span className="material-symbols-rounded text-16 mr-1">rocket_launch</span>
                          {busy === entry.projectId ? 'Deploying...' : 'Deploy'}
                        </Button>
                        <Button variant="text" size="sm" onClick={() => doTest(entry.url)}><span className="material-symbols-rounded text-16 mr-1">science</span>Test</Button>
                        <Button variant="text" size="sm" onClick={() => openEdit(project, client)}><span className="material-symbols-rounded text-16 mr-1">edit</span></Button>
                        <Button variant="text" size="sm" className="text-md-error" onClick={() => doUndeploy(entry)}><span className="material-symbols-rounded text-16 mr-1">delete</span></Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="tonal" className="w-full" onClick={() => openEdit(project, client)}>
                      <span className="material-symbols-rounded text-18 mr-1">tune</span>Configure
                    </Button>
                  )}
                  <div className="mt-3 pt-3 border-t border-md-outline-variant/50">
                    <Link href={`/clients/${client.id}/projects/${project.id}`} className="text-body-small text-md-primary hover:underline">Project Details →</Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Modal */}
        {editItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditItem(null)}>
            <Card className="w-[500px] mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Configure Staging</CardTitle>
                <CardDescription>{editItem.project.name} — {editItem.client.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Subdomain */}
                <div>
                  <label className="text-label-medium text-md-on-surface-variant block mb-1">Subdomain</label>
                  <div className="flex items-center gap-2">
                    <Input value={sub} onChange={e => setSub(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="ncm" className="flex-1" />
                    <span className="text-body-medium text-md-on-surface-variant shrink-0">.{DOM}</span>
                  </div>
                  <p className="text-body-small text-md-on-surface-variant mt-1">
                    URL: <span className="text-md-primary">{sub ? `https://${sub}.${DOM}` : '...'}</span>
                  </p>
                </div>

                {/* Repo selector */}
                <div>
                  <label className="text-label-medium text-md-on-surface-variant block mb-1">GitHub Repo</label>
                  <select
                    value={repo}
                    onChange={e => setRepo(e.target.value)}
                    className="w-full p-3 rounded-xl bg-md-surface-container/50 border border-md-outline-variant text-md-on-surface focus:border-md-primary focus:outline-none"
                  >
                    <option value="">Select a repo...</option>
                    {(editItem.project.githubRepos || []).map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Target */}
                <div>
                  <label className="text-label-medium text-md-on-surface-variant block mb-1">Deployment Target</label>
                  <div className="flex gap-2">
                    {[
                      { value: '192.168.1.161', label: '192.168.1.161', desc: 'Production Docker host' },
                      { value: '192.168.1.72', label: '192.168.1.72', desc: 'Local machine (this PC)' },
                    ].map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setTarget(t.value)}
                        className={`flex-1 p-3 rounded-xl text-left border-2 transition-all ${target === t.value ? 'border-md-primary bg-md-primary-container/50' : 'border-transparent bg-md-surface-container/50 hover:bg-md-surface-container'}`}
                      >
                        <p className="text-body-medium font-medium text-md-on-surface">{t.label}</p>
                        <p className="text-body-small text-md-on-surface-variant">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tunnel toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-md-surface-container/50">
                  <div>
                    <p className="text-label-large text-md-on-surface">Cloudflared Tunnel</p>
                    <p className="text-body-small text-md-on-surface-variant">Route via config.yml on this PC</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTun(!tun)}
                    className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ml-4 ${tun ? 'bg-md-primary' : 'bg-md-surface-variant'}`}
                    role="switch"
                    aria-checked
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${tun ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="text" onClick={() => setEditItem(null)}>Cancel</Button>
                  <Button onClick={doSave} disabled={!repo}><span className="material-symbols-rounded text-18 mr-1">save</span>Save</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
