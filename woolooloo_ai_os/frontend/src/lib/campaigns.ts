const CAMPAIGNS_KEY = 'woolooloo-campaigns';

export type CampaignPlatform = 'linkedin' | 'google-ads' | 'email' | 'facebook';
export type CampaignStatus = 'active' | 'paused' | 'completed';

export interface Campaign {
  id: string;
  name: string;
  platform: CampaignPlatform;
  status: CampaignStatus;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  budget: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignStats {
  total: number;
  active: number;
  paused: number;
  completed: number;
  totalSpend: number;
  totalConversions: number;
}

export function getCampaigns(): Campaign[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(CAMPAIGNS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

export function saveCampaigns(campaigns: Campaign[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
}

export function addCampaign(data: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Campaign {
  const campaigns = getCampaigns();
  const now = new Date().toISOString();
  const newCampaign: Campaign = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  campaigns.push(newCampaign);
  saveCampaigns(campaigns);
  return newCampaign;
}

export function updateCampaign(id: string, updates: Partial<Campaign>): Campaign | null {
  const campaigns = getCampaigns();
  const idx = campaigns.findIndex(c => c.id === id);
  if (idx === -1) return null;
  campaigns[idx] = { ...campaigns[idx], ...updates, updatedAt: new Date().toISOString() };
  saveCampaigns(campaigns);
  return campaigns[idx];
}

export function deleteCampaign(id: string): boolean {
  const before = getCampaigns().length;
  saveCampaigns(getCampaigns().filter(c => c.id !== id));
  return getCampaigns().length < before;
}

export function getCampaignById(id: string): Campaign | null {
  return getCampaigns().find(c => c.id === id) || null;
}

export function getCampaignStats(): CampaignStats {
  const campaigns = getCampaigns();
  return {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    paused: campaigns.filter(c => c.status === 'paused').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
    totalSpend: campaigns.reduce((sum, c) => sum + c.spend, 0),
    totalConversions: campaigns.reduce((sum, c) => sum + c.conversions, 0),
  };
}

export function seedMockCampaigns(): void {
  const existing = getCampaigns();
  if (existing.length > 0) return;

  const now = new Date().toISOString();
  const mocks: Campaign[] = [
    { id: '1', name: 'Electrician Lead Gen Q1', platform: 'google-ads', status: 'active', impressions: 45230, clicks: 1823, conversions: 156, spend: 2450, budget: 5000, startDate: '2024-01-01', endDate: '2024-03-31', createdAt: now, updatedAt: now },
    { id: '2', name: 'Plumber Awareness Campaign', platform: 'linkedin', status: 'active', impressions: 28450, clicks: 892, conversions: 67, spend: 1890, budget: 3000, startDate: '2024-02-01', endDate: '2024-04-30', createdAt: now, updatedAt: now },
    { id: '3', name: 'Caterer Holiday Promo', platform: 'facebook', status: 'paused', impressions: 15670, clicks: 534, conversions: 42, spend: 890, budget: 2000, startDate: '2023-11-01', endDate: '2023-12-31', createdAt: now, updatedAt: now },
    { id: '4', name: 'Email Newsletter - January', platform: 'email', status: 'completed', impressions: 8920, clicks: 1245, conversions: 89, spend: 0, budget: 0, startDate: '2024-01-15', endDate: '2024-01-15', createdAt: now, updatedAt: now },
    { id: '5', name: 'LinkedIn Thought Leadership', platform: 'linkedin', status: 'active', impressions: 32100, clicks: 1567, conversions: 123, spend: 3200, budget: 6000, startDate: '2024-01-15', endDate: '2024-06-30', createdAt: now, updatedAt: now },
  ];

  saveCampaigns(mocks);
}
