// WoolWorks tenant analytics - backend data store
// Tenants using the WoolWorks SaaS platform

const STORAGE_KEY = "woolooloo-woolworks-tenants";
const REVENUE_KEY = "woolooloo-woolworks-revenue";
const MODEL_USAGE_KEY = "woolooloo-woolworks-models";
const TELEMETRY_KEY = "woolooloo-woolworks-telemetry";

export interface ModelUsage {
  model: string;
  calls: number;
  tokens: number;
  cost: number;
}

export interface TenantUsage {
  tokensIn: number;
  tokensOut: number;
  apiCalls: number;
  modelsUsed: ModelUsage[];
  computeHours: number;
  storageGB: number;
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: "starter" | "pro" | "enterprise";
  monthlyFee: number;
  status: "active" | "trial" | "suspended";
  joinedAt: string;
  usage: TenantUsage;
}

export interface RevenueRecord {
  month: string;
  revenue: number;
  costs: number;
  tokens: number;
  tenants: number;
}

export interface TelemetryEvent {
  id: string;
  tenantId: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latency: number;
  timestamp: string;
}

/* ===================== SERVER-SIDE STORAGE ===================== */
// For API routes that run server-side (no localStorage)
const serverStore: Record<string, any> = {};

function getServerStore<T>(key: string, seedFn: () => void): T[] {
  if (!serverStore[key]) {
    seedFn();
    // Seed into server store
    if (key === "tenants") {
      const tenants: Tenant[] = [
        {
          id: "t1", name: "SPARC", domain: "sparc.co.za", plan: "enterprise", monthlyFee: 25000,
          status: "active", joinedAt: "2024-01-15",
          usage: {
            tokensIn: 12500000, tokensOut: 4800000, apiCalls: 15420, computeHours: 156, storageGB: 42.5,
            modelsUsed: [
              { model: "claude-opus-4-8", calls: 8200, tokens: 12500000, cost: 485 },
              { model: "gpt-4o", calls: 4100, tokens: 3200000, cost: 320 },
              { model: "gpt-4o-mini", calls: 3120, tokens: 980000, cost: 48 },
            ],
          },
        },
        {
          id: "t2", name: "BuildIt Solutions", domain: "buildit.co.za", plan: "pro", monthlyFee: 8500,
          status: "active", joinedAt: "2024-03-01",
          usage: {
            tokensIn: 5800000, tokensOut: 2100000, apiCalls: 6840, computeHours: 68, storageGB: 18.2,
            modelsUsed: [
              { model: "gpt-4o", calls: 3200, tokens: 4200000, cost: 280 },
              { model: "claude-opus-4-8", calls: 2100, tokens: 1100000, cost: 85 },
              { model: "gpt-4o-mini", calls: 1540, tokens: 500000, cost: 22 },
            ],
          },
        },
        {
          id: "t3", name: "AgriTech ZA", domain: "agritech.co.za", plan: "starter", monthlyFee: 2500,
          status: "active", joinedAt: "2024-05-10",
          usage: {
            tokensIn: 1200000, tokensOut: 450000, apiCalls: 1850, computeHours: 12, storageGB: 5.8,
            modelsUsed: [
              { model: "gpt-4o-mini", calls: 1200, tokens: 800000, cost: 18 },
              { model: "gpt-4o", calls: 450, tokens: 350000, cost: 42 },
              { model: "claude-opus-4-8", calls: 200, tokens: 50000, cost: 12 },
            ],
          },
        },
        {
          id: "t4", name: "MedConnect", domain: "medconnect.co.za", plan: "pro", monthlyFee: 8500,
          status: "trial", joinedAt: "2024-06-01",
          usage: {
            tokensIn: 3200000, tokensOut: 1100000, apiCalls: 3200, computeHours: 35, storageGB: 12.1,
            modelsUsed: [
              { model: "claude-opus-4-8", calls: 1800, tokens: 2400000, cost: 195 },
              { model: "gpt-4o", calls: 1000, tokens: 700000, cost: 72 },
              { model: "gpt-4o-mini", calls: 400, tokens: 100000, cost: 5 },
            ],
          },
        },
        {
          id: "t5", name: "FinServ Group", domain: "finserv.co.za", plan: "enterprise", monthlyFee: 25000,
          status: "active", joinedAt: "2024-02-20",
          usage: {
            tokensIn: 8900000, tokensOut: 3200000, apiCalls: 9800, computeHours: 98, storageGB: 28.4,
            modelsUsed: [
              { model: "gpt-4o", calls: 5200, tokens: 5800000, cost: 420 },
              { model: "claude-opus-4-8", calls: 3100, tokens: 2600000, cost: 210 },
              { model: "gpt-4o-mini", calls: 1500, tokens: 500000, cost: 22 },
            ],
          },
        },
        {
          id: "t6", name: "EduLearn", domain: "edulearn.co.za", plan: "starter", monthlyFee: 2500,
          status: "suspended", joinedAt: "2024-04-05",
          usage: {
            tokensIn: 800000, tokensOut: 300000, apiCalls: 980, computeHours: 8, storageGB: 3.2,
            modelsUsed: [
              { model: "gpt-4o-mini", calls: 700, tokens: 600000, cost: 12 },
              { model: "gpt-4o", calls: 280, tokens: 200000, cost: 28 },
            ],
          },
        },
      ];
      serverStore[key] = tenants;
    } else if (key === "revenue") {
      serverStore[key] = [
        { month: "Jan", revenue: 25000, costs: 18200, tokens: 8500000, tenants: 2 },
        { month: "Feb", revenue: 25000, costs: 18500, tokens: 9200000, tenants: 2 },
        { month: "Mar", revenue: 33500, costs: 24100, tokens: 14800000, tenants: 3 },
        { month: "Apr", revenue: 36000, costs: 28500, tokens: 18200000, tenants: 4 },
        { month: "May", revenue: 38500, costs: 32200, tokens: 22500000, tenants: 5 },
        { month: "Jun", revenue: 71500, costs: 48800, tokens: 33600000, tenants: 6 },
      ];
    }
  }
  return serverStore[key] as T[];
}

/* ===================== CRUD ===================== */

export function getTenants(): Tenant[] {
  // Server-side (API routes)
  if (typeof window === "undefined") {
    return getServerStore<Tenant>("tenants", seedTenants);
  }
  // Client-side
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { seedTenants(); return getTenants(); }
    return JSON.parse(raw);
  } catch { return []; }
}

export function getTenantById(id: string): Tenant | undefined {
  return getTenants().find(t => t.id === id);
}

export function getActiveTenants(): Tenant[] {
  return getTenants().filter(t => t.status === "active");
}

export function getTrialTenants(): Tenant[] {
  return getTenants().filter(t => t.status === "trial");
}

export function addTenant(tenant: Omit<Tenant, "id" | "joinedAt">): Tenant {
  if (typeof window === "undefined") {
    const tenants = getServerStore<Tenant>("tenants", seedTenants);
    const newTenant: Tenant = { ...tenant, id: `t${Date.now()}`, joinedAt: new Date().toISOString() };
    tenants.push(newTenant);
    return newTenant;
  }
  const tenants = getTenants();
  const newTenant: Tenant = { ...tenant, id: `t${Date.now()}`, joinedAt: new Date().toISOString() };
  tenants.push(newTenant);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tenants));
  return newTenant;
}

export function updateTenant(id: string, updates: Partial<Tenant>): Tenant | null {
  if (typeof window === "undefined") return null;
  const tenants = getTenants();
  const idx = tenants.findIndex(t => t.id === id);
  if (idx === -1) return null;
  tenants[idx] = { ...tenants[idx], ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tenants));
  return tenants[idx];
}

export function deleteTenant(id: string): boolean {
  if (typeof window === "undefined") return false;
  const tenants = getTenants().filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tenants));
  return true;
}

/* ===================== REVENUE ===================== */

export function getRevenueData(): RevenueRecord[] {
  if (typeof window === "undefined") {
    const store = getServerStore<Tenant>("tenants", seedTenants); // Ensure seeded
    return [
      { month: "Jan", revenue: 25000, costs: 18200, tokens: 8500000, tenants: 2 },
      { month: "Feb", revenue: 25000, costs: 18500, tokens: 9200000, tenants: 2 },
      { month: "Mar", revenue: 33500, costs: 24100, tokens: 14800000, tenants: 3 },
      { month: "Apr", revenue: 36000, costs: 28500, tokens: 18200000, tenants: 4 },
      { month: "May", revenue: 38500, costs: 32200, tokens: 22500000, tenants: 5 },
      { month: "Jun", revenue: 71500, costs: 48800, tokens: 33600000, tenants: 6 },
    ];
  }
  try {
    const raw = localStorage.getItem(REVENUE_KEY);
    if (!raw) { seedRevenue(); return getRevenueData(); }
    return JSON.parse(raw);
  } catch { return []; }
}

export function addRevenueRecord(record: RevenueRecord): void {
  const data = getRevenueData();
  // Replace existing month or push new
  const idx = data.findIndex(d => d.month === record.month);
  if (idx !== -1) data[idx] = record;
  else data.push(record);
  localStorage.setItem(REVENUE_KEY, JSON.stringify(data));
}

/* ===================== MODEL USAGE AGGREGATION ===================== */

export function getModelAggregation(): ModelUsage[] {
  const tenants = getTenants();
  const map = new Map<string, ModelUsage>();
  tenants.forEach(t => t.usage.modelsUsed.forEach(m => {
    const ex = map.get(m.model) || { model: m.model, calls: 0, tokens: 0, cost: 0 };
    ex.calls += m.calls;
    ex.tokens += m.tokens;
    ex.cost += m.cost;
    map.set(m.model, ex);
  }));
  return Array.from(map.values()).sort((a, b) => b.calls - a.calls);
}

/* ===================== TELEMETRY ===================== */

export function getTelemetryEvents(): TelemetryEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TELEMETRY_KEY);
    if (!raw) { seedTelemetry(); return getTelemetryEvents(); }
    return JSON.parse(raw);
  } catch { return []; }
}

export function addTelemetryEvent(event: Omit<TelemetryEvent, "id" | "timestamp">): TelemetryEvent {
  const events = getTelemetryEvents();
  const newEvent: TelemetryEvent = { ...event, id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, timestamp: new Date().toISOString() };
  events.push(newEvent);
  // Keep last 1000 events
  if (events.length > 1000) events.splice(0, events.length - 1000);
  localStorage.setItem(TELEMETRY_KEY, JSON.stringify(events));
  return newEvent;
}

/* ===================== SEED DATA ===================== */

export function seedTenants(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(STORAGE_KEY)) return; // Already seeded

  const tenants: Tenant[] = [
    {
      id: "t1", name: "SPARC", domain: "sparc.co.za", plan: "enterprise", monthlyFee: 25000,
      status: "active", joinedAt: "2024-01-15",
      usage: {
        tokensIn: 12500000, tokensOut: 4800000, apiCalls: 15420, computeHours: 156, storageGB: 42.5,
        modelsUsed: [
          { model: "claude-opus-4-8", calls: 8200, tokens: 12500000, cost: 485 },
          { model: "deepseek-v4-flash", calls: 4100, tokens: 3200000, cost: 320 },
          { model: "qwen3-7-max", calls: 3120, tokens: 980000, cost: 48 },
        ],
      },
    },
    {
      id: "t2", name: "BuildIt Solutions", domain: "buildit.co.za", plan: "pro", monthlyFee: 8500,
      status: "active", joinedAt: "2024-03-01",
      usage: {
        tokensIn: 5800000, tokensOut: 2100000, apiCalls: 6840, computeHours: 68, storageGB: 18.2,
        modelsUsed: [
          { model: "deepseek-v4-flash", calls: 3200, tokens: 4200000, cost: 280 },
          { model: "claude-opus-4-8", calls: 2100, tokens: 1100000, cost: 85 },
          { model: "qwen3-7-max", calls: 1540, tokens: 500000, cost: 22 },
        ],
      },
    },
    {
      id: "t3", name: "AgriTech ZA", domain: "agritech.co.za", plan: "starter", monthlyFee: 2500,
      status: "active", joinedAt: "2024-05-10",
      usage: {
        tokensIn: 1200000, tokensOut: 450000, apiCalls: 1850, computeHours: 12, storageGB: 5.8,
        modelsUsed: [
          { model: "qwen3-7-max", calls: 1200, tokens: 800000, cost: 18 },
          { model: "deepseek-v4-flash", calls: 450, tokens: 350000, cost: 42 },
          { model: "claude-opus-4-8", calls: 200, tokens: 50000, cost: 12 },
        ],
      },
    },
    {
      id: "t4", name: "MedConnect", domain: "medconnect.co.za", plan: "pro", monthlyFee: 8500,
      status: "trial", joinedAt: "2024-06-01",
      usage: {
        tokensIn: 3200000, tokensOut: 1100000, apiCalls: 3200, computeHours: 35, storageGB: 12.1,
        modelsUsed: [
          { model: "claude-opus-4-8", calls: 1800, tokens: 2400000, cost: 195 },
          { model: "gpt-4o", calls: 1000, tokens: 700000, cost: 72 },
          { model: "gpt-4o-mini", calls: 400, tokens: 100000, cost: 5 },
        ],
      },
    },
    {
      id: "t5", name: "FinServ Group", domain: "finserv.co.za", plan: "enterprise", monthlyFee: 25000,
      status: "active", joinedAt: "2024-02-20",
      usage: {
        tokensIn: 8900000, tokensOut: 3200000, apiCalls: 9800, computeHours: 98, storageGB: 28.4,
        modelsUsed: [
          { model: "gpt-4o", calls: 5200, tokens: 5800000, cost: 420 },
          { model: "claude-opus-4-8", calls: 3100, tokens: 2600000, cost: 210 },
          { model: "gpt-4o-mini", calls: 1500, tokens: 500000, cost: 22 },
        ],
      },
    },
    {
      id: "t6", name: "EduLearn", domain: "edulearn.co.za", plan: "starter", monthlyFee: 2500,
      status: "suspended", joinedAt: "2024-04-05",
      usage: {
        tokensIn: 800000, tokensOut: 300000, apiCalls: 980, computeHours: 8, storageGB: 3.2,
        modelsUsed: [
          { model: "gpt-4o-mini", calls: 700, tokens: 600000, cost: 12 },
          { model: "gpt-4o", calls: 280, tokens: 200000, cost: 28 },
        ],
      },
    },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tenants));
}

export function seedRevenue(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(REVENUE_KEY)) return;

  const data: RevenueRecord[] = [
    { month: "Jan", revenue: 25000, costs: 18200, tokens: 8500000, tenants: 2 },
    { month: "Feb", revenue: 25000, costs: 18500, tokens: 9200000, tenants: 2 },
    { month: "Mar", revenue: 33500, costs: 24100, tokens: 14800000, tenants: 3 },
    { month: "Apr", revenue: 36000, costs: 28500, tokens: 18200000, tenants: 4 },
    { month: "May", revenue: 38500, costs: 32200, tokens: 22500000, tenants: 5 },
    { month: "Jun", revenue: 71500, costs: 48800, tokens: 33600000, tenants: 6 },
  ];
  localStorage.setItem(REVENUE_KEY, JSON.stringify(data));
}

export function seedTelemetry(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(TELEMETRY_KEY)) return;

  const models = ["claude-opus-4-8", "gpt-4o", "gpt-4o-mini"];
  const tenantIds = ["t1", "t2", "t3", "t4", "t5"];
  const events: TelemetryEvent[] = [];

  // Generate last 7 days of events
  for (let d = 6; d >= 0; d--) {
    const hour = Math.floor(Math.random() * 24);
    const minute = Math.floor(Math.random() * 60);
    for (let i = 0; i < 50; i++) {
      events.push({
        id: `evt_seed_${d}_${i}`,
        tenantId: tenantIds[Math.floor(Math.random() * tenantIds.length)],
        model: models[Math.floor(Math.random() * models.length)],
        tokensIn: Math.floor(Math.random() * 4000) + 100,
        tokensOut: Math.floor(Math.random() * 2000) + 50,
        latency: Math.floor(Math.random() * 2000) + 200,
        timestamp: new Date(Date.now() - d * 86400000 + hour * 3600000 + minute * 60000).toISOString(),
      });
    }
  }
  localStorage.setItem(TELEMETRY_KEY, JSON.stringify(events));
}

export function seedAll(): void {
  seedTenants();
  seedRevenue();
  seedTelemetry();
}

/* ===================== AGGREGATED METRICS ===================== */

export function getMetrics(): {
  activeTenants: number;
  trialTenants: number;
  totalMRR: number;
  totalTokens: number;
  totalApiCalls: number;
  totalCost: number;
  totalCompute: number;
  margin: number;
  planCounts: Record<string, number>;
} {
  const tenants = getTenants();
  const active = tenants.filter(t => t.status === "active");
  const trials = tenants.filter(t => t.status === "trial");
  const totalMRR = active.reduce((s, t) => s + t.monthlyFee, 0);
  const totalTokens = tenants.reduce((s, t) => s + t.usage.tokensIn + t.usage.tokensOut, 0);
  const totalApiCalls = tenants.reduce((s, t) => s + t.usage.apiCalls, 0);
  const totalCost = tenants.reduce((s, t) => s + t.usage.modelsUsed.reduce((c, m) => c + m.cost, 0), 0);
  const totalCompute = tenants.reduce((s, t) => s + t.usage.computeHours, 0);
  const margin = totalMRR > 0 ? (totalMRR - totalCost) / totalMRR * 100 : 0;
  const planCounts: Record<string, number> = { starter: 0, pro: 0, enterprise: 0 };
  tenants.forEach(t => { if (planCounts[t.plan] !== undefined) planCounts[t.plan]++; });

  return { activeTenants: active.length, trialTenants: trials.length, totalMRR, totalTokens, totalApiCalls, totalCost, totalCompute, margin, planCounts };
}
