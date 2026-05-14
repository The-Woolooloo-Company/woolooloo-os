const LEADS_KEY = 'woolooloo-leads';

export type LeadSource = 'linkedin' | 'google-ads' | 'email' | 'facebook' | 'website' | 'referral';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: LeadSource;
  status: LeadStatus;
  value: number;
  campaignId: string;
  campaignName: string;
  assignedTo: string;
  createdAt: string;
  lastContact: string;
  notes: string;
  updatedAt: string;
}

export interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  proposal: number;
  won: number;
  lost: number;
  totalValue: number;
}

export function getLeads(): Lead[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(LEADS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

export function saveLeads(leads: Lead[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
}

export function addLead(data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Lead {
  const leads = getLeads();
  const now = new Date().toISOString();
  const newLead: Lead = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  leads.push(newLead);
  saveLeads(leads);
  return newLead;
}

export function updateLead(id: string, updates: Partial<Lead>): Lead | null {
  const leads = getLeads();
  const idx = leads.findIndex(l => l.id === id);
  if (idx === -1) return null;
  leads[idx] = { ...leads[idx], ...updates, updatedAt: new Date().toISOString() };
  saveLeads(leads);
  return leads[idx];
}

export function deleteLead(id: string): boolean {
  const before = getLeads().length;
  saveLeads(getLeads().filter(l => l.id !== id));
  return getLeads().length < before;
}

export function getLeadById(id: string): Lead | null {
  return getLeads().find(l => l.id === id) || null;
}

export function getLeadStats(): LeadStats {
  const leads = getLeads();
  return {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    qualified: leads.filter(l => l.status === 'qualified').length,
    proposal: leads.filter(l => l.status === 'proposal').length,
    won: leads.filter(l => l.status === 'won').length,
    lost: leads.filter(l => l.status === 'lost').length,
    totalValue: leads.reduce((sum, l) => sum + l.value, 0),
  };
}

export function seedMockLeads(): void {
  const existing = getLeads();
  if (existing.length > 0) return;

  const now = new Date().toISOString();
  const mocks: Lead[] = [
    { id: '1', name: 'John Smith', email: 'john.smith@techcorp.com', phone: '+27 82 123 4567', company: 'TechCorp Solutions', source: 'google-ads', status: 'qualified', value: 45000, campaignId: '1', campaignName: 'Electrician Lead Gen Q1', assignedTo: 'Sarah Johnson', createdAt: '2024-01-15', lastContact: '2024-01-20', notes: 'Interested in commercial electrical services, budget R50k+', updatedAt: now },
    { id: '2', name: 'Emily Davis', email: 'emily@designstudio.co.za', phone: '+27 83 234 5678', company: 'Design Studio', source: 'linkedin', status: 'contacted', value: 28000, campaignId: '2', campaignName: 'Plumber Awareness Campaign', assignedTo: 'Mike Chen', createdAt: '2024-02-05', lastContact: '2024-02-06', notes: 'Office renovation project, needs plumbing inspection', updatedAt: now },
    { id: '3', name: 'Robert Wilson', email: 'rob@eventplanners.com', phone: '+27 84 345 6789', company: 'Event Planners Pro', source: 'facebook', status: 'proposal', value: 15000, campaignId: '3', campaignName: 'Caterer Holiday Promo', assignedTo: 'Sarah Johnson', createdAt: '2024-01-10', lastContact: '2024-01-18', notes: 'Wedding catering for 150 guests, March 2024', updatedAt: now },
    { id: '4', name: 'Lisa Thompson', email: 'lisa.t@marketing.co.za', phone: '+27 85 456 7890', company: 'Marketing Masters', source: 'email', status: 'won', value: 62000, campaignId: '4', campaignName: 'Email Newsletter - January', assignedTo: 'Mike Chen', createdAt: '2024-01-08', lastContact: '2024-01-22', notes: 'Signed annual retainer for digital marketing', updatedAt: now },
    { id: '5', name: 'David Brown', email: 'david@consultinggroup.com', phone: '+27 86 567 8901', company: 'Consulting Group', source: 'linkedin', status: 'qualified', value: 95000, campaignId: '5', campaignName: 'LinkedIn Thought Leadership', assignedTo: 'Sarah Johnson', createdAt: '2024-01-20', lastContact: '2024-01-25', notes: 'Annual consulting contract, very interested', updatedAt: now },
    { id: '6', name: 'Jane Miller', email: 'jane@retailchain.co.za', phone: '+27 87 678 9012', company: 'Retail Chain', source: 'website', status: 'new', value: 35000, campaignId: '', campaignName: '', assignedTo: 'Unassigned', createdAt: '2024-02-10', lastContact: '', notes: 'Inquiry via website contact form', updatedAt: now },
    { id: '7', name: 'Sam Peters', email: 'sam@construction.co.za', phone: '+27 88 789 0123', company: 'Peters Construction', source: 'referral', status: 'contacted', value: 120000, campaignId: '', campaignName: '', assignedTo: 'Mike Chen', createdAt: '2024-01-30', lastContact: '2024-02-01', notes: 'Referred by John Smith, needs full electrical installation', updatedAt: now },
    { id: '8', name: 'Anna van Wyk', email: 'anna@startup.co.za', phone: '+27 89 890 1234', company: 'Tech Startup', source: 'google-ads', status: 'lost', value: 22000, campaignId: '1', campaignName: 'Electrician Lead Gen Q1', assignedTo: 'Sarah Johnson', createdAt: '2024-01-12', lastContact: '2024-01-28', notes: 'Budget constraints, went with competitor', updatedAt: now },
  ];

  saveLeads(mocks);
}
