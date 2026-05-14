"use client";

import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import {
  getLeads, addLead, updateLead, deleteLead, seedMockLeads,
  Lead, LeadStatus, LeadSource,
} from "@/lib/leads";

const sourceIcons: Record<string, string> = {
  linkedin: "language", "google-ads": "ads_click", email: "email",
  facebook: "facebook", website: "language", referral: "people",
};

const sourceColors: Record<string, string> = {
  linkedin: "info", "google-ads": "primary", email: "warning",
  facebook: "secondary", website: "tertiary", referral: "success",
};

const statusConfig: Record<string, { variant: string; label: string }> = {
  new: { variant: "secondary-tonal", label: "New" },
  contacted: { variant: "info-tonal", label: "Contacted" },
  qualified: { variant: "warning-tonal", label: "Qualified" },
  proposal: { variant: "primary-tonal", label: "Proposal" },
  won: { variant: "success-tonal", label: "Won" },
  lost: { variant: "error-tonal", label: "Lost" },
};

const statusNext: Record<string, LeadStatus> = {
  new: "contacted", contacted: "qualified", qualified: "proposal", proposal: "won", won: "won", lost: "lost",
};

export default function LeadsPage() {
  const { showToast } = useToast();
  const [leads, setLeads] = useState<Lead[]>(() => getLeads());
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [dropdown, setDropdown] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    name: "", email: "", phone: "", company: "",
    source: "linkedin" as LeadSource, status: "new" as LeadStatus,
    value: 0, campaignName: "", assignedTo: "Unassigned", notes: "",
  });

  useEffect(() => { seedMockLeads(); setLeads(getLeads()); }, []);

  const filtered = useMemo(() =>
    leads.filter(l => {
      if (filter !== "all" && l.source !== filter) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      const s = search.toLowerCase();
      return l.name.toLowerCase().includes(s) || l.company.toLowerCase().includes(s) || l.email.toLowerCase().includes(s);
    }),
    [leads, filter, statusFilter, search]
  );

  const stats = useMemo(() => {
    const totalValue = filtered.reduce((s, l) => s + l.value, 0);
    const wonValue = filtered.filter(l => l.status === "won").reduce((s, l) => s + l.value, 0);
    const active = filtered.filter(l => ["new","contacted","qualified","proposal"].includes(l.status)).length;
    const rate = filtered.length > 0 ? ((filtered.filter(l => l.status === "won").length / filtered.length) * 100).toFixed(1) : "0";
    return { total: filtered.length, totalValue, wonValue, activeLeads: active, conversionRate: rate };
  }, [filtered]);

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    updateLead(leadId, { status: newStatus });
    setLeads(getLeads());
    setDropdown(null);
    showToast(`Status updated to ${statusConfig[newStatus].label}`, "success");
  };

  const handleDelete = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead || !confirm(`Delete lead "${lead.name}"?`)) return;
    deleteLead(leadId);
    setLeads(getLeads());
    setDropdown(null);
    if (selectedLead?.id === leadId) setShowDetails(false);
    showToast(`Lead "${lead.name}" deleted`, "success");
  };

  const handleSaveAdd = () => {
    if (!addForm.name.trim()) return;
    addLead({ ...addForm, lastContact: new Date().toISOString(), campaignId: "" });
    setLeads(getLeads());
    setShowAdd(false);
    setAddForm({ name: "", email: "", phone: "", company: "", source: "linkedin", status: "new", value: 0, campaignName: "", assignedTo: "Unassigned", notes: "" });
    showToast(`Lead "${addForm.name}" created`, "success");
  };

  const handleEditSave = () => {
    if (!selectedLead) return;
    updateLead(selectedLead.id, selectedLead);
    setLeads(getLeads());
    setEditMode(false);
    showToast(`Lead "${selectedLead.name}" updated`, "success");
  };

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />
      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-display-small text-md-on-surface">Leads</h1>
          <p className="text-body-large text-md-on-surface-variant mt-1">
            Track and manage leads from all your marketing campaigns
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon="group" label="Active Leads" value={stats.activeLeads.toString()} color="primary" />
          <StatCard icon="payments" label="Total Pipeline" value={`R${(stats.totalValue/1000).toFixed(1)}k`} color="success" />
          <StatCard icon="check_circle" label="Won Deals" value={`R${(stats.wonValue/1000).toFixed(1)}k`} color="tertiary" />
          <StatCard icon="trending_up" label="Conversion" value={`${stats.conversionRate}%`} color="info" />
        </div>

        {/* Filters */}
        <Card variant="tonal" className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} startIcon={<span className="material-symbols-rounded text-20">search</span>} />
              <select className="h-12 px-4 rounded-xl border border-md-outline/50 bg-md-surface text-body-medium text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary/50" value={filter} onChange={e => setFilter(e.target.value)}>
                <option value="all">All Sources</option>
                {(["linkedin","google-ads","email","facebook","website","referral"] as const).map(s => <option key={s} value={s}>{s.split("-").map(w => w[0].toUpperCase()+w.slice(1)).join(" ")}</option>)}
              </select>
              <select className="h-12 px-4 rounded-xl border border-md-outline/50 bg-md-surface text-body-medium text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary/50" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                {(["new","contacted","qualified","proposal","won","lost"] as const).map(s => <option key={s} value={s}>{statusConfig[s].label}</option>)}
              </select>
              <Button variant="filled" onClick={() => setShowAdd(true)}>
                <span className="material-symbols-rounded text-18 mr-1">add</span>
                Add Lead
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <span className="material-symbols-rounded text-64 text-md-on-surface-variant/30 block mb-4">group_add</span>
                <p className="text-body-large text-md-on-surface-variant">No leads found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-md-outline-variant/50">
                      <th className="text-left py-4 px-6 text-label-medium text-md-on-surface-variant font-medium">Lead</th>
                      <th className="text-left py-4 px-4 text-label-medium text-md-on-surface-variant font-medium">Company</th>
                      <th className="text-left py-4 px-4 text-label-medium text-md-on-surface-variant font-medium">Source</th>
                      <th className="text-left py-4 px-4 text-label-medium text-md-on-surface-variant font-medium">Status</th>
                      <th className="text-right py-4 px-4 text-label-medium text-md-on-surface-variant font-medium">Value</th>
                      <th className="text-left py-4 px-4 text-label-medium text-md-on-surface-variant font-medium">Campaign</th>
                      <th className="text-left py-4 px-4 text-label-medium text-md-on-surface-variant font-medium">Assigned</th>
                      <th className="text-right py-4 px-6 text-label-medium text-md-on-surface-variant font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(lead => (
                      <tr key={lead.id} className="border-b border-md-outline-variant/25 hover:bg-md-on-surface/5 transition-colors">
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-md-primary-container flex items-center justify-center text-md-on-primary-container text-label-medium flex-shrink-0">
                              {lead.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-label-large text-md-on-surface font-medium">{lead.name}</p>
                              <p className="text-body-small text-md-on-surface-variant">{lead.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-body-medium text-md-on-surface">{lead.company}</p>
                          <p className="text-body-small text-md-on-surface-variant">{lead.phone}</p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-rounded text-18 text-md-on-surface-variant">{sourceIcons[lead.source]}</span>
                            <span className="text-body-small text-md-on-surface">{lead.source.split("-").map(w=>w[0].toUpperCase()+w.slice(1)).join(" ")}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={statusConfig[lead.status].variant as any}>{statusConfig[lead.status].label}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-label-large text-md-on-surface font-medium">R{lead.value.toLocaleString()}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-body-medium text-md-on-surface-variant truncate block max-w-[120px]">{lead.campaignName}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-body-medium text-md-on-surface">{lead.assignedTo}</span>
                        </td>
                        <td className="py-3 px-6 text-right relative">
                          <Button variant="text" size="sm" onClick={e => { e.stopPropagation(); setDropdown(dropdown === lead.id ? null : lead.id); }}>
                            <span className="material-symbols-rounded text-20">more_vert</span>
                          </Button>
                          {dropdown === lead.id && (
                            <div className="absolute right-0 top-10 z-20 w-48 rounded-xl bg-md-surface-container shadow-md-4 border border-md-outline-variant/50 overflow-hidden">
                              <button className="w-full flex items-center gap-2 px-4 py-3 text-body-medium text-md-on-surface hover:bg-md-on-surface/5 text-left" onClick={() => { setSelectedLead(lead); setShowDetails(true); setDropdown(null); }}>
                                <span className="material-symbols-rounded text-18">visibility</span>View
                              </button>
                              <button className="w-full flex items-center gap-2 px-4 py-3 text-body-medium text-md-on-surface hover:bg-md-on-surface/5 text-left" onClick={() => handleStatusChange(lead.id, statusNext[lead.status])}>
                                <span className="material-symbols-rounded text-18">arrow_forward</span>Move to {statusConfig[statusNext[lead.status]]?.label || "Next"}
                              </button>
                              <button className="w-full flex items-center gap-2 px-4 py-3 text-body-medium text-md-error hover:bg-md-error-container text-left" onClick={() => handleDelete(lead.id)}>
                                <span className="material-symbols-rounded text-18">delete</span>Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Lead Details Modal */}
      {showDetails && selectedLead && (
        <LeadDetailsModal lead={selectedLead} editMode={editMode} setEditMode={setEditMode} setSelectedLead={setSelectedLead} onClose={() => setShowDetails(false)} onSave={handleEditSave} onDelete={() => { handleDelete(selectedLead.id); setShowDetails(false); }} />
      )}

      {/* Add Lead Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAdd(false)}>
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-28">add</span>
                  Add Lead
                </CardTitle>
                <Button variant="text" size="sm" onClick={() => setShowAdd(false)}>
                  <span className="material-symbols-rounded text-20">close</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input label="Name *" value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} placeholder="Full name" autoFocus />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Email" type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} placeholder="email@example.com" />
                <Input label="Phone" value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} placeholder="+27 82 123 4567" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Company" value={addForm.company} onChange={e => setAddForm({...addForm, company: e.target.value})} placeholder="Company name" />
                <Input label="Value (R)" type="number" value={addForm.value.toString()} onChange={e => setAddForm({...addForm, value: Number(e.target.value)})} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-label-small text-md-on-surface-variant block mb-1.5 ml-1">Source</label>
                  <select className="w-full h-12 px-4 rounded-xl border border-md-outline/50 bg-md-surface text-body-medium text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary/50" value={addForm.source} onChange={e => setAddForm({...addForm, source: e.target.value as LeadSource})}>
                    {(["linkedin","google-ads","email","facebook","website","referral"] as const).map(s => <option key={s} value={s}>{s.split("-").map(w=>w[0].toUpperCase()+w.slice(1)).join(" ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-label-small text-md-on-surface-variant block mb-1.5 ml-1">Status</label>
                  <select className="w-full h-12 px-4 rounded-xl border border-md-outline/50 bg-md-surface text-body-medium text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary/50" value={addForm.status} onChange={e => setAddForm({...addForm, status: e.target.value as LeadStatus})}>
                    {(["new","contacted","qualified","proposal"] as const).map(s => <option key={s} value={s}>{statusConfig[s].label}</option>)}
                  </select>
                </div>
                <Input label="Assigned To" value={addForm.assignedTo} onChange={e => setAddForm({...addForm, assignedTo: e.target.value})} placeholder="Team member" />
              </div>
              <Input label="Campaign" value={addForm.campaignName} onChange={e => setAddForm({...addForm, campaignName: e.target.value})} placeholder="Campaign name" />
              <Textarea label="Notes" value={addForm.notes} onChange={e => setAddForm({...addForm, notes: e.target.value})} placeholder="Any additional notes..." />
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="text" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button variant="filled" onClick={handleSaveAdd} disabled={!addForm.name.trim()}>
                  <span className="material-symbols-rounded text-18 mr-1">add</span>
                  Add Lead
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

interface StatCardProps { icon: string; label: string; value: string; color: "primary" | "secondary" | "tertiary" | "success" | "info" | "error"; }
function StatCard({ icon, label, value, color }: StatCardProps) {
  const bgMap: Record<string, string> = {
    primary: "bg-md-primary text-md-on-primary", secondary: "bg-md-secondary text-md-on-secondary",
    tertiary: "bg-md-tertiary text-md-on-tertiary", success: "bg-success text-on-success",
    info: "bg-info text-on-info", error: "bg-md-error text-md-on-error",
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

interface LeadDetailsProps {
  lead: Lead; editMode: boolean; setEditMode: (v: boolean) => void;
  setSelectedLead: (l: Lead) => void; onClose: () => void;
  onSave: () => void; onDelete: () => void;
}

function LeadDetailsModal({ lead, editMode, setEditMode, setSelectedLead, onClose, onSave, onDelete }: LeadDetailsProps) {
  const set = (key: keyof Lead, value: any) => setSelectedLead({...lead, [key]: value});
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span className="material-symbols-rounded text-28 text-md-primary">group</span>
              {editMode ? "Edit Lead" : "Lead Details"}
            </CardTitle>
            <Button variant="text" size="sm" onClick={onClose}><span className="material-symbols-rounded text-20">close</span></Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="flex flex-col items-center p-4 rounded-xl bg-md-surface-container/50">
            <div className="h-16 w-16 rounded-full bg-md-primary flex items-center justify-center text-md-on-primary text-headline-large font-medium mb-3">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            {editMode ? (
              <Input value={lead.name} onChange={e => set("name", e.target.value)} />
            ) : (
              <p className="text-title-large text-md-on-surface font-medium">{lead.name}</p>
            )}
            {editMode ? (
              <Input value={lead.company} onChange={e => set("company", e.target.value)} />
            ) : (
              <p className="text-body-medium text-md-on-surface-variant">{lead.company}</p>
            )}
            {!editMode && (
              <div className="flex gap-2 mt-4">
                <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-md-primary text-md-on-primary text-label-medium hover:opacity-90">
                  <span className="material-symbols-rounded text-16">email</span>Email
                </a>
                <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-success text-on-success text-label-medium hover:opacity-90">
                  <span className="material-symbols-rounded text-16">phone</span>Call
                </a>
              </div>
            )}
          </div>
          {/* Details */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Status">
                {editMode ? (
                  <select className="w-full h-10 px-3 rounded-xl border border-md-outline/50 bg-md-surface text-body-medium text-md-on-surface" value={lead.status} onChange={e => set("status", e.target.value as LeadStatus)}>
                    {(Object.keys(statusConfig) as LeadStatus[]).map(s => <option key={s} value={s}>{statusConfig[s].label}</option>)}
                  </select>
                ) : (
                  <Badge variant={statusConfig[lead.status].variant as any}>{statusConfig[lead.status].label}</Badge>
                )}
              </Field>
              <Field label="Value">
                {editMode ? (
                  <input className="w-full h-10 px-3 rounded-xl border border-md-outline/50 bg-md-surface text-body-medium text-md-on-surface" type="number" value={lead.value} onChange={e => set("value", Number(e.target.value))} />
                ) : (
                  <span className="text-title-medium font-medium text-md-on-surface">R{lead.value.toLocaleString()}</span>
                )}
              </Field>
              <Field label="Email">
                {editMode ? <input className="w-full h-10 px-3 rounded-xl border border-md-outline/50 bg-md-surface text-body-medium" value={lead.email} onChange={e => set("email", e.target.value)} /> : <span className="text-body-medium text-md-on-surface">{lead.email}</span>}
              </Field>
              <Field label="Phone">
                {editMode ? <input className="w-full h-10 px-3 rounded-xl border border-md-outline/50 bg-md-surface text-body-medium" value={lead.phone} onChange={e => set("phone", e.target.value)} /> : <span className="text-body-medium text-md-on-surface">{lead.phone}</span>}
              </Field>
              <Field label="Source">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-18 text-md-on-surface-variant">{sourceIcons[lead.source]}</span>
                  <span className="text-body-medium text-md-on-surface">{lead.source.split("-").map(w=>w[0].toUpperCase()+w.slice(1)).join(" ")}</span>
                </div>
              </Field>
              <Field label="Campaign">
                {editMode ? <input className="w-full h-10 px-3 rounded-xl border border-md-outline/50 bg-md-surface text-body-medium" value={lead.campaignName} onChange={e => set("campaignName", e.target.value)} /> : <span className="text-body-medium text-md-on-surface">{lead.campaignName}</span>}
              </Field>
              <Field label="Assigned To">
                {editMode ? <input className="w-full h-10 px-3 rounded-xl border border-md-outline/50 bg-md-surface text-body-medium" value={lead.assignedTo} onChange={e => set("assignedTo", e.target.value)} /> : <span className="text-body-medium text-md-on-surface">{lead.assignedTo}</span>}
              </Field>
              <Field label="Created">
                <span className="text-body-medium text-md-on-surface-variant">{new Date(lead.createdAt).toLocaleDateString()}</span>
              </Field>
            </div>
            <Field label="Notes">
              {editMode ? <textarea className="w-full px-3 py-2 rounded-xl border border-md-outline/50 bg-md-surface text-body-medium text-md-on-surface" rows={3} value={lead.notes} onChange={e => set("notes", e.target.value)} /> : <div className="p-4 rounded-xl bg-md-surface-container/50 text-body-medium text-md-on-surface-variant">{lead.notes}</div>}
            </Field>
          </div>
        </CardContent>
        <div className="flex gap-3 justify-between p-6 border-t border-md-outline-variant/50">
          <Button variant="text" onClick={onClose}>Close</Button>
          <div className="flex gap-2">
            {editMode ? (
              <>
                <Button variant="text" onClick={() => setEditMode(false)}>Cancel</Button>
                <Button variant="filled" onClick={onSave}><span className="material-symbols-rounded text-18 mr-1">check</span>Save</Button>
              </>
            ) : (
              <>
                <Button variant="tonal" onClick={() => setEditMode(true)}><span className="material-symbols-rounded text-18 mr-1">edit</span>Edit</Button>
                <Button variant="text" className="text-md-error" onClick={onDelete}><span className="material-symbols-rounded text-18 mr-1">delete</span>Delete</Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-label-small text-md-on-surface-variant mb-1">{label}</p>
      {children}
    </div>
  );
}
