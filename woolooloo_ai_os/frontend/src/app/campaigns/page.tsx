"use client";

import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import {
  getCampaigns, addCampaign, updateCampaign, deleteCampaign, seedMockCampaigns,
  Campaign, CampaignPlatform, CampaignStatus,
} from "@/lib/campaigns";

const platformIcons: Record<string, string> = {
  linkedin: "language", "google-ads": "ads_click", email: "email", facebook: "facebook",
};

const platformColors: Record<string, string> = {
  linkedin: "info", "google-ads": "primary", email: "warning", facebook: "secondary",
};

const statusConfig: Record<string, { variant: string; label: string }> = {
  active: { variant: "success-tonal", label: "Active" },
  paused: { variant: "warning-tonal", label: "Paused" },
  completed: { variant: "secondary-tonal", label: "Completed" },
};

export default function CampaignsPage() {
  const { showToast } = useToast();
  const [campaigns, setCampaigns] = useState(() => getCampaigns());
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dropdown, setDropdown] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "", platform: "linkedin" as CampaignPlatform, status: "active" as CampaignStatus,
    impressions: 0, clicks: 0, conversions: 0, spend: 0, budget: 0, startDate: "", endDate: "",
  });

  useEffect(() => { seedMockCampaigns(); setCampaigns(getCampaigns()); }, []);

  const filtered = useMemo(() =>
    campaigns.filter(c => {
      if (filter !== "all" && c.status !== filter) return false;
      return c.name.toLowerCase().includes(search.toLowerCase());
    }),
    [campaigns, filter, search]
  );

  const stats = useMemo(() => {
    const imp = filtered.reduce((s, c) => s + c.impressions, 0);
    const clk = filtered.reduce((s, c) => s + c.clicks, 0);
    const spend = filtered.reduce((s, c) => s + c.spend, 0);
    return { active: filtered.filter(c => c.status === "active").length, impressions: imp, ctr: imp > 0 ? ((clk / imp) * 100).toFixed(2) : "0", spend };
  }, [filtered]);

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: "", platform: "linkedin", status: "active", impressions: 0, clicks: 0, conversions: 0, spend: 0, budget: 0, startDate: "", endDate: "" });
  };

  const openEdit = (c: Campaign) => {
    setEditingId(c.id);
    setFormData({ name: c.name, platform: c.platform, status: c.status, impressions: c.impressions, clicks: c.clicks, conversions: c.conversions, spend: c.spend, budget: c.budget, startDate: c.startDate, endDate: c.endDate });
    setShowModal(true);
    setDropdown(null);
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;
    if (editingId) { updateCampaign(editingId, formData); showToast(`Campaign "${formData.name}" updated`, "success"); }
    else { addCampaign(formData); showToast(`Campaign "${formData.name}" created`, "success"); }
    setCampaigns(getCampaigns()); setShowModal(false); resetForm();
  };

  const handleDelete = (c: Campaign) => {
    if (!confirm(`Delete campaign "${c.name}"?`)) return;
    deleteCampaign(c.id); setCampaigns(getCampaigns()); setDropdown(null);
    showToast(`Campaign "${c.name}" deleted`, "success");
  };

  const handleDuplicate = (c: Campaign) => {
    addCampaign({ name: `${c.name} (copy)`, platform: c.platform, status: "paused", impressions: 0, clicks: 0, conversions: 0, spend: 0, budget: c.budget, startDate: new Date().toISOString().split("T")[0], endDate: c.endDate });
    setCampaigns(getCampaigns()); setDropdown(null);
    showToast(`Campaign "${c.name}" duplicated`, "success");
  };

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />
      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-display-small text-md-on-surface">Campaigns</h1>
          <p className="text-body-large text-md-on-surface-variant mt-1">
            Manage and track your marketing campaigns across all platforms
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon="campaign" label="Active" value={stats.active.toString()} color="primary" />
          <StatCard icon="visibility" label="Impressions" value={`${(stats.impressions/1000).toFixed(1)}k`} color="info" />
          <StatCard icon="trending_up" label="CTR" value={`${stats.ctr}%`} color="tertiary" />
          <StatCard icon="payments" label="Spend" value={`R${stats.spend.toLocaleString()}`} color="success" />
        </div>

        <Card variant="tonal" className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)} startIcon={<span className="material-symbols-rounded text-20">search</span>} />
              <div className="flex gap-1">
                {(["all","active","paused","completed"] as const).map(f => (
                  <button key={f} className={`px-3 py-2 rounded-lg text-label-medium font-medium transition-all duration-200 min-h-[48px] ${filter === f ? "bg-md-primary text-md-on-primary shadow-md-1" : "bg-md-surface-container/50 text-md-on-surface hover:bg-md-surface-container"}`} onClick={() => setFilter(f)}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <Button variant="filled" onClick={() => { resetForm(); setShowModal(true); }}>
                <span className="material-symbols-rounded text-18 mr-1">add</span>
                New Campaign
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <span className="material-symbols-rounded text-64 text-md-on-surface-variant/30 block mb-4">campaign</span>
                <p className="text-body-large text-md-on-surface-variant">No campaigns found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-md-outline-variant/50">
                      <th className="text-left py-4 px-6 text-label-medium text-md-on-surface-variant font-medium">Campaign</th>
                      <th className="text-left py-4 px-4 text-label-medium text-md-on-surface-variant font-medium">Platform</th>
                      <th className="text-left py-4 px-4 text-label-medium text-md-on-surface-variant font-medium">Status</th>
                      <th className="text-right py-4 px-4 text-label-medium text-md-on-surface-variant font-medium">Impressions</th>
                      <th className="text-right py-4 px-4 text-label-medium text-md-on-surface-variant font-medium">Clicks</th>
                      <th className="text-right py-4 px-4 text-label-medium text-md-on-surface-variant font-medium">Conv.</th>
                      <th className="text-left py-4 px-4 text-label-medium text-md-on-surface-variant font-medium">Spend / Budget</th>
                      <th className="text-right py-4 px-6 text-label-medium text-md-on-surface-variant font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(c => {
                      const pct = c.budget > 0 ? (c.spend / c.budget) * 100 : 0;
                      return (
                        <tr key={c.id} className="border-b border-md-outline-variant/25 hover:bg-md-on-surface/5 transition-colors">
                          <td className="py-3 px-6">
                            <p className="text-label-large text-md-on-surface font-medium">{c.name}</p>
                            <p className="text-body-small text-md-on-surface-variant">{new Date(c.startDate).toLocaleDateString()} - {new Date(c.endDate).toLocaleDateString()}</p>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-rounded text-18 text-md-on-surface-variant">{platformIcons[c.platform]}</span>
                              <span className="text-body-small text-md-on-surface">{c.platform.split("-").map(w=>w[0].toUpperCase()+w.slice(1)).join(" ")}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={statusConfig[c.status].variant as any}>{statusConfig[c.status].label}</Badge>
                          </td>
                          <td className="py-3 px-4 text-right"><span className="text-body-medium text-md-on-surface">{c.impressions.toLocaleString()}</span></td>
                          <td className="py-3 px-4 text-right"><span className="text-body-medium text-md-on-surface">{c.clicks.toLocaleString()}</span></td>
                          <td className="py-3 px-4 text-right"><span className="text-body-medium text-md-on-surface">{c.conversions}</span></td>
                          <td className="py-3 px-4">
                            <p className="text-body-medium text-md-on-surface">R{c.spend.toLocaleString()}</p>
                            {c.budget > 0 && (
                              <>
                                <div className="h-1 rounded-full bg-md-surface-variant overflow-hidden mt-1">
                                  <div className={`h-full rounded-full ${pct > 90 ? "bg-md-error" : "bg-md-primary"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                </div>
                                <p className="text-body-small text-md-on-surface-variant">{Math.round(pct)}% of R{c.budget.toLocaleString()}</p>
                              </>
                            )}
                          </td>
                          <td className="py-3 px-6 text-right relative">
                            <Button variant="text" size="sm" onClick={() => setDropdown(dropdown === c.id ? null : c.id)}>
                              <span className="material-symbols-rounded text-20">more_vert</span>
                            </Button>
                            {dropdown === c.id && (
                              <div className="absolute right-0 top-10 z-20 w-48 rounded-xl bg-md-surface-container shadow-md-4 border border-md-outline-variant/50 overflow-hidden">
                                <button className="w-full flex items-center gap-2 px-4 py-3 text-body-medium text-md-on-surface hover:bg-md-on-surface/5 text-left" onClick={() => openEdit(c)}>
                                  <span className="material-symbols-rounded text-18">edit</span>Edit
                                </button>
                                <button className="w-full flex items-center gap-2 px-4 py-3 text-body-medium text-md-on-surface hover:bg-md-on-surface/5 text-left" onClick={() => handleDuplicate(c)}>
                                  <span className="material-symbols-rounded text-18">content_copy</span>Duplicate
                                </button>
                                <button className="w-full flex items-center gap-2 px-4 py-3 text-body-medium text-md-error hover:bg-md-error-container text-left" onClick={() => handleDelete(c)}>
                                  <span className="material-symbols-rounded text-18">delete</span>Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setShowModal(false); resetForm(); }}>
          <Card className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-28">{editingId ? "edit" : "add"}</span>
                  {editingId ? "Edit Campaign" : "New Campaign"}
                </CardTitle>
                <Button variant="text" size="sm" onClick={() => { setShowModal(false); resetForm(); }}>
                  <span className="material-symbols-rounded text-20">close</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input label="Campaign Name *" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Q1 Lead Gen" autoFocus />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-label-small text-md-on-surface-variant block mb-1.5 ml-1">Platform</label>
                  <select className="w-full h-12 px-4 rounded-xl border border-md-outline/50 bg-md-surface text-body-medium text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary/50" value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value as CampaignPlatform})}>
                    {(["linkedin","google-ads","email","facebook"] as const).map(p => <option key={p} value={p}>{p.split("-").map(w=>w[0].toUpperCase()+w.slice(1)).join(" ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-label-small text-md-on-surface-variant block mb-1.5 ml-1">Status</label>
                  <select className="w-full h-12 px-4 rounded-xl border border-md-outline/50 bg-md-surface text-body-medium text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary/50" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as CampaignStatus})}>
                    {(["active","paused","completed"] as const).map(s => <option key={s} value={s}>{statusConfig[s].label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <Input label="Impressions" type="number" value={formData.impressions.toString()} onChange={e => setFormData({...formData, impressions: Number(e.target.value)})} />
                <Input label="Clicks" type="number" value={formData.clicks.toString()} onChange={e => setFormData({...formData, clicks: Number(e.target.value)})} />
                <Input label="Conversions" type="number" value={formData.conversions.toString()} onChange={e => setFormData({...formData, conversions: Number(e.target.value)})} />
                <Input label="Spend (R)" type="number" value={formData.spend.toString()} onChange={e => setFormData({...formData, spend: Number(e.target.value)})} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input label="Budget (R)" type="number" value={formData.budget.toString()} onChange={e => setFormData({...formData, budget: Number(e.target.value)})} />
                <div>
                  <label className="text-label-small text-md-on-surface-variant block mb-1.5 ml-1">Start Date</label>
                  <input type="date" className="w-full h-12 px-4 rounded-xl border border-md-outline/50 bg-md-surface text-body-medium text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary/50" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div>
                  <label className="text-label-small text-md-on-surface-variant block mb-1.5 ml-1">End Date</label>
                  <input type="date" className="w-full h-12 px-4 rounded-xl border border-md-outline/50 bg-md-surface text-body-medium text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary/50" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="text" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
                <Button variant="filled" onClick={handleSave} disabled={!formData.name.trim()}>
                  <span className="material-symbols-rounded text-18 mr-1">check</span>
                  {editingId ? "Update" : "Create"} Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

interface StatCardProps { icon: string; label: string; value: string; color: "primary" | "info" | "tertiary" | "success"; }
function StatCard({ icon, label, value, color }: StatCardProps) {
  const bgMap: Record<string, string> = {
    primary: "bg-md-primary text-md-on-primary", info: "bg-info text-on-info",
    tertiary: "bg-md-tertiary text-md-on-tertiary", success: "bg-success text-on-success",
  };
  return (
    <Card><CardContent className="pt-6">
      <div className="flex items-center gap-4">
        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-md-1 ${bgMap[color]}`}>
          <span className="material-symbols-rounded text-24">{icon}</span>
        </div>
        <div>
          <p className="text-label-medium text-md-on-surface-variant">{label}</p>
          <p className="text-headline-medium font-medium text-md-on-surface">{value}</p>
        </div>
      </div>
    </CardContent></Card>
  );
}
