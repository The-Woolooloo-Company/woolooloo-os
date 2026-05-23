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
const DOMAIN = 'woolooloo.tech';
const CF_API = 'http://192.168.1.72:9090';

interface Entry {
  projectId: string;
  projectName: string;
  clientName: string;
  subdomain: string;
  url: string;
  status: 'idle' | 'deploying' | 'live' | 'error';
  lastDeploy?: string;
  tunnel: boolean;
}

function load(): Entry[] {
  if (typeof window === 'undefined') return [];
  try { const d = localStorage.getItem(KEY); return d ? JSON.parse(d) : []; } catch { return []; }
}
function save(d: Entry[]) { if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify(d)); }

export default function Page() {
  const { showToast } = useToast();
  const [items, setItems] = useState<{ project: ClientProject; client: Client }[]>([]);
  const [data, setData] = useState<Entry[]>([]);
  const [editItem, setEditItem] = useState<{ project: ClientProject; client: Client } | null>(null);
  const [sub, setSub] = useState('');
  const [tun, setTun] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    seedMockClients();
    setItems(getAllProjects());
    setData(load());
  }, []);

  const find = (id: string) => data.find(e => e.projectId === id);

  const openEdit = (p: ClientProject, c: Client) => {
    setEditItem({ project: p, client: c });
    const ex = find(p.id);
    setSub(ex?.subdomain || p.name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    setTun(ex?.tunnel ?? true);
  };

  const doSave = () => {
    if (!editItem) return;
    const { project, client } = editItem;
    const url = `https://${sub}.${DOMAIN}`;
    const ex = find(project.id);
    const entry: Entry = {
      projectId: project.id, projectName: project.name, clientName: client.name,
      subdomain: sub, url, status: ex?.status || 'idle', lastDeploy: ex?.lastDeploy, tunnel: tun,
    };
    const updated = data.filter(e => e.projectId !== project.id);
    updated.push(entry);
    setData(updated);
    save(updated);
    setEditItem(null);
    showToast(`${project.name} → ${url}`, "success");
  };

  const doDeploy = (e: Entry) => {
    setBusy(e.projectId);
    setData(prev => prev.map(x => x.projectId === e.projectId ? { ...x, status: 'deploying' } : x));
    showToast(`Deploying ${e.projectName}...`, "info");
    setTimeout(() => {
      setData(prev => prev.map(x => x.projectId === e.projectId ? { ...x, status: 'live', lastDeploy: new Date().toISOString() } : x));
      setBusy(null);
      showToast(`${e.projectName} deployed!`, "success");
    }, 3000);
  };

  const doTest = async (url: string) => {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      showToast(`${url}: HTTP ${r.status}`, r.ok ? "success" : "error");
    } catch (e: any) { showToast(`${url}: ${e.message}`, "error"); }
  };

  if (!items.length) return <div className="min-h-screen bg-md-surface flex items-center justify-center"><span className="h-8 w-8 animate-spin rounded-full border-4 border-md-primary border-r-transparent" /></div>;

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />
      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-display-small text-md-on-surface">Staging</h1>
            <p className="text-body-large text-md-on-surface-variant mt-1">Deploy project previews via *.woolooloo.tech</p>
          </div>
          <Button variant="tonal" onClick={() => {
            fetch(`${CF_API}/ready`, { signal: AbortSignal.timeout(3000) })
              .then(r => r.ok ? showToast("Cloudflared: Connected", "success") : showToast("Cloudflared: Down", "error"))
              .catch(() => showToast("Cloudflared: Unreachable", "error"));
          }}>
            <span className="material-symbols-rounded text-18 mr-1">dns</span>Cloudflared
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Projects', value: items.length },
            { label: 'Configured', value: data.length },
            { label: 'Live', value: data.filter(e => e.status === 'live').length },
            { label: 'Tunnels', value: data.filter(e => e.tunnel).length },
          ].map((s, i) => (
            <Card key={i}><CardContent className="pt-6">
              <p className="text-headline-medium text-md-on-surface">{s.value}</p>
              <p className="text-label-medium text-md-on-surface-variant">{s.label}</p>
            </CardContent></Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(({ project, client }) => {
            const entry = find(project.id);
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
                      {entry.tunnel && <Badge variant="primary-tonal"><span className="material-symbols-rounded text-14 mr-1">cloud</span>Tunnel</Badge>}
                      {entry.lastDeploy && <p className="text-body-small text-md-on-surface-variant">Deployed: {new Date(entry.lastDeploy).toLocaleString()}</p>}
                      <div className="flex gap-2">
                        <Button variant="tonal" size="sm" onClick={() => doDeploy(entry)} disabled={busy === entry.projectId}>
                          <span className="material-symbols-rounded text-16 mr-1">rocket_launch</span>{busy === entry.projectId ? '...' : 'Deploy'}
                        </Button>
                        <Button variant="text" size="sm" onClick={() => doTest(entry.url)}><span className="material-symbols-rounded text-16 mr-1">science</span>Test</Button>
                        <Button variant="text" size="sm" onClick={() => openEdit(project, client)}><span className="material-symbols-rounded text-16 mr-1">edit</span></Button>
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

        {editItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditItem(null)}>
            <Card className="w-[450px] mx-4" onClick={e => e.stopPropagation()}>
              <CardHeader><CardTitle>Configure Staging</CardTitle><CardDescription>{editItem.project.name} — {editItem.client.name}</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-label-medium text-md-on-surface-variant block mb-1">Subdomain</label>
                  <div className="flex items-center gap-2">
                    <Input value={sub} onChange={e => setSub(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="acme" className="flex-1" />
                    <span className="text-body-medium text-md-on-surface-variant shrink-0">.{DOMAIN}</span>
                  </div>
                  <p className="text-body-small text-md-on-surface-variant mt-1">URL: <span className="text-md-primary">{sub ? `https://${sub}.${DOMAIN}` : '...'}</span></p>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-md-surface-container/50">
                  <div>
                    <p className="text-label-large text-md-on-surface">Cloudflared Tunnel</p>
                    <p className="text-body-small text-md-on-surface-variant">Via /DATA/AppData/cloudflared/config.yml</p>
                  </div>
                  <button onClick={() => setTun(!tun)} className={`w-12 h-7 rounded-full transition-colors relative ${tun ? 'bg-md-primary' : 'bg-md-surface-variant'}`}>
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${tun ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="text" onClick={() => setEditItem(null)}>Cancel</Button>
                  <Button onClick={doSave}><span className="material-symbols-rounded text-18 mr-1">save</span>Save</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
