const CLIENTS_KEY = 'woolooloo-clients';

export type IntegrationType = 'github' | 'bitbucket' | 'jira' | 'confluence' | 'linear' | 'clockify';

export interface ClientIntegration {
  type: IntegrationType;
  connected: boolean;
  config: Record<string, string>;
  lastSync?: string;
}

export interface ClientProject {
  id: string;
  name: string;
  description?: string;
  linearProjectId?: string;
  linearProjectKey?: string;
  clockifyProjectId?: string;
  githubRepos?: string[]; // The-Woolooloo-Company/repo-name (can be multiple)
  agentsEnabled: boolean; // can be toggled per project (some projects have manual dev)
  integrations: ClientIntegration[];
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  color: string;
  projects: ClientProject[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Storage Helpers ─────────────────────────────────────────

export function getClients(): Client[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(CLIENTS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

export function saveClients(clients: Client[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
}

export function getClientById(clientId: string): Client | null {
  return getClients().find(c => c.id === clientId) || null;
}

export function addClient(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'projects'>): Client {
  const clients = getClients();
  const now = new Date().toISOString();
  const newClient: Client = { ...client, id: crypto.randomUUID(), createdAt: now, updatedAt: now, projects: [] };
  clients.push(newClient);
  saveClients(clients);
  return newClient;
}

export function updateClient(clientId: string, updates: Partial<Client>): Client | null {
  const clients = getClients();
  const idx = clients.findIndex(c => c.id === clientId);
  if (idx === -1) return null;
  clients[idx] = { ...clients[idx], ...updates, updatedAt: new Date().toISOString() };
  saveClients(clients);
  return clients[idx];
}

export function deleteClient(clientId: string): boolean {
  const clients = getClients().filter(c => c.id !== clientId);
  saveClients(clients);
  return true;
}

// ─── Project Helpers ─────────────────────────────────────────

export function addProject(clientId: string, project: Omit<ClientProject, 'id' | 'createdAt'>): ClientProject | null {
  const clients = getClients();
  const client = clients.find(c => c.id === clientId);
  if (!client) return null;
  const newProject: ClientProject = { ...project, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  client.projects.push(newProject);
  saveClients(clients);
  return newProject;
}

export function updateProject(clientId: string, projectId: string, updates: Partial<ClientProject>): ClientProject | null {
  const clients = getClients();
  const client = clients.find(c => c.id === clientId);
  if (!client) return null;
  const idx = client.projects.findIndex(p => p.id === projectId);
  if (idx === -1) return null;
  client.projects[idx] = { ...client.projects[idx], ...updates };
  saveClients(clients);
  return client.projects[idx];
}

export function deleteProject(clientId: string, projectId: string): boolean {
  const clients = getClients();
  const client = clients.find(c => c.id === clientId);
  if (!client) return false;
  client.projects = client.projects.filter(p => p.id !== projectId);
  saveClients(clients);
  return true;
}

export function getAllProjects(): { project: ClientProject; client: Client }[] {
  return getClients().flatMap(c => c.projects.map(p => ({ project: p, client: c })));
}

export function getProjectsByClient(clientId: string): ClientProject[] {
  const client = getClientById(clientId);
  return client ? client.projects : [];
}

export function getClientLinearProjectIds(clientId: string): string[] {
  const client = getClientById(clientId);
  if (!client) return [];
  return client.projects
    .map(p => p.linearProjectId)
    .filter((id): id is string => !!id);
}

export function getClientClockifyProjectIds(clientId: string): string[] {
  const client = getClientById(clientId);
  if (!client) return [];
  return client.projects
    .map(p => p.clockifyProjectId)
    .filter((id): id is string => !!id);
}

export function getClientGithubRepos(clientId: string): string[] {
  const client = getClientById(clientId);
  if (!client) return [];
  return client.projects
    .map(p => p.githubRepos)
    .flat()
    .filter((repo): repo is string => !!repo);
}

// ─── Seed Real Data ──────────────────────────────────────────
// Source: Linear API + Clockify API (fetched 2025-05-11)
// Linear projects: https://linear.app/woolooloo/settings/projects
// Clockify projects: https://clockify.me/works/628df4f7ff03bd3855e1fc0e/projects

export function seedMockClients(): void {
  try {
    const existing = getClients();
    // Check for latest seed version — needs 7Colours + 7 clients + Acme Corp + PAM repos in Brandication
    const hasAcme = existing.some(c => c.id === 'acme-corp');
    const hasGithubRepos = existing.some(c => c.projects.some(p => Array.isArray((p as any).githubRepos) && (p as any).githubRepos.length > 0));
    const woolsappHasClockify = existing.some(c => c.projects.some(p => p.id === 'woolsapp' && p.clockifyProjectId));
    const nsClearHasRepos = existing.some(c => c.projects.some(p => p.id === 'ns-clear' && Array.isArray((p as any).githubRepos) && (p as any).githubRepos.length > 0));
    const brandicationHasRepos = existing.some(c => c.projects.some(p => p.id === 'pai-brandication' && Array.isArray((p as any).githubRepos) && (p as any).githubRepos.length > 0));
    const brandicationHasPAM = existing.some(c => c.projects.some(p => p.id === 'pai-brandication' && Array.isArray((p as any).githubRepos) && (p as any).githubRepos.some((r: string) => typeof r === 'string' && r.includes('PAM'))));
    if (existing.length === 7 && hasAcme && existing.some(c => c.id === '7colours') && existing.some(c => c.id === 'netsweeper') && hasGithubRepos && woolsappHasClockify && nsClearHasRepos && brandicationHasRepos && brandicationHasPAM) {
      return; // already has latest seed
    }
  } catch {
    // If validation fails for any reason, fall through to re-seed
  }
  // Either empty or outdated — re-seed with latest

  const REAL_CLIENTS: Client[] = [
    {
      id: 'netsweeper',
      name: 'Netsweeper',
      color: 'primary',
      notes: 'Network filtering & security solutions. Clockify client: Netsweeper (id: 628dffcec0997772f8ddf8a4)',
      createdAt: new Date(2024, 0, 1).toISOString(),
      updatedAt: new Date().toISOString(),
      projects: [
        {
          id: 'ns-onguard',
          name: 'On-guard',
          description: 'Network security monitoring & AI threat detection. Django annotation app, Flask model inference runner, RabbitMQ enrichment, TensorFlow Serving, PostgreSQL, keyword management, risk monitoring.',
          linearProjectId: '3a2bc98a-7bc8-46e7-bf22-2176a8bc0d32',
          linearProjectKey: 'OG',
          clockifyProjectId: '632db72db64ae80b402f6abc',
          githubRepos: [
            'The-Woolooloo-Company/onGuard-AI-alfred',
            'The-Woolooloo-Company/onGuard-AI-AlfredModel',
            'The-Woolooloo-Company/onGuard-AI-Runner',
            'The-Woolooloo-Company/onGuard-DataExplorer',
            'The-Woolooloo-Company/onguard-infra-monorepo',
            'The-Woolooloo-Company/onguard-infra-web',
            'The-Woolooloo-Company/onguard-infra-runner_old',
            'The-Woolooloo-Company/onguard-infra-db',
            'The-Woolooloo-Company/alfred-ai-inference-engine',
            'The-Woolooloo-Company/sequence-modelling',
          ],
          agentsEnabled: true,
          integrations: [
            { type: 'linear', connected: true, config: { projectId: '3a2bc98a-7bc8-46e7-bf22-2176a8bc0d32' } },
            { type: 'clockify', connected: true, config: { projectId: '632db72db64ae80b402f6abc' } },
            { type: 'github', connected: true, config: { repos: 'onGuard' } },
          ],
          createdAt: new Date(2024, 0, 1).toISOString(),
        },
        {
          id: 'ns-clear',
          name: 'NS Clear',
          description: 'Network visibility and analytics',
          linearProjectId: '0295c01f-e3ae-4a8d-89b3-7d30f6ad53a5',
          linearProjectKey: 'NS',
          clockifyProjectId: '68f675c73437e1165fe35cd6',
          githubRepos: [
            'The-Woolooloo-Company/ns-clear-infra',
            'The-Woolooloo-Company/ns-clear-dashboard',
          ],
          agentsEnabled: true,
          integrations: [
            { type: 'linear', connected: true, config: { projectId: '0295c01f-e3ae-4a8d-89b3-7d30f6ad53a5' } },
            { type: 'clockify', connected: true, config: { projectId: '68f675c73437e1165fe35cd6' } },
            { type: 'github', connected: true, config: { repos: 'ns-clear' } },
          ],
          createdAt: new Date(2024, 0, 1).toISOString(),
        },
      ],
    },
    {
      id: 'netcore',
      name: 'Netcore',
      color: 'info',
      notes: 'Privileged Access Management. Clockify client: Netcore Media (id: 63a1b7f8314699172f6b22ac)',
      createdAt: new Date(2024, 0, 1).toISOString(),
      updatedAt: new Date().toISOString(),
      projects: [
        {
          id: 'nc-pam',
          name: 'Network Core',
          description: 'Privileged Access Management platform',
          linearProjectId: '01bd02de-8c64-479a-8c0a-9ca43b24ebd6',
          linearProjectKey: 'PAM',
          clockifyProjectId: '628dffdb690b30632737fdad',
          githubRepos: [
            'The-Woolooloo-Company/ncm-spectrum',
          ],
          agentsEnabled: true,
          integrations: [
            { type: 'linear', connected: true, config: { projectId: '01bd02de-8c64-479a-8c0a-9ca43b24ebd6' } },
            { type: 'clockify', connected: true, config: { projectId: '628dffdb690b30632737fdad' } },
          ],
          createdAt: new Date(2024, 0, 1).toISOString(),
        },
      ],
    },
    {
      id: 'zazi-play',
      name: 'Zazi Play',
      color: 'warning',
      notes: 'Interactive media & analytics. Clockify client: Zazi Play (id: 6906d5dcf3abca62406593f7)',
      createdAt: new Date(2024, 0, 1).toISOString(),
      updatedAt: new Date().toISOString(),
      projects: [
        {
          id: 'zazi-kick',
          name: 'KICK Analytics',
          description: 'Kinetics, Insights, Coaching & Knowledge Analytics platform',
          linearProjectId: 'b84eafe6-524b-436f-969d-561ffc86bbb3',
          linearProjectKey: 'ZP',
          clockifyProjectId: '68121484c27c4b2ba2ab2dee',
          githubRepos: [
            'The-Woolooloo-Company/COACH-Runner',
            'The-Woolooloo-Company/COACH-Web',
            'The-Woolooloo-Company/COACH-infra-runner',
            'The-Woolooloo-Company/COACH-infra-web',
            'The-Woolooloo-Company/COACH-infra-monorepo',
            'The-Woolooloo-Company/coachAIV2',
            'The-Woolooloo-Company/coachAI',
          ],
          agentsEnabled: true,
          integrations: [
            { type: 'linear', connected: true, config: { projectId: 'b84eafe6-524b-436f-969d-561ffc86bbb3' } },
            { type: 'clockify', connected: true, config: { projectId: '68121484c27c4b2ba2ab2dee' } },
            { type: 'github', connected: true, config: { repos: 'COACH' } },
          ],
          createdAt: new Date(2024, 0, 1).toISOString(),
        },
      ],
    },
    {
      id: 'precision-ai',
      name: 'Precision AI Marketing',
      color: 'success',
      notes: 'AI-powered marketing automation. Clockify client: Precision AI Marketing (id: 67751e2c2622fe7a013a7c63)',
      createdAt: new Date(2024, 0, 1).toISOString(),
      updatedAt: new Date().toISOString(),
      projects: [
        {
          id: 'pai-brandication',
          name: 'Brandication',
          description: 'AI marketing platform',
          linearProjectId: '5d20d5f6-9d1f-4762-b13c-9859a9d73478',
          linearProjectKey: 'PAI',
          clockifyProjectId: '668bdec0f106f36223181af3',
          githubRepos: [
            'The-Woolooloo-Company/brandication-ai',
            'The-Woolooloo-Company/brandication-api',
            'The-Woolooloo-Company/PAM-infra-monorepo',
            'The-Woolooloo-Company/PAM-Runner',
            'The-Woolooloo-Company/PAM-infra-runner',
            'The-Woolooloo-Company/PAM-infra-web',
            'The-Woolooloo-Company/PAM-Web',
          ],
          agentsEnabled: true,
          integrations: [
            { type: 'linear', connected: true, config: { projectId: '5d20d5f6-9d1f-4762-b13c-9859a9d73478' } },
            { type: 'clockify', connected: true, config: { projectId: '668bdec0f106f36223181af3' } },
            { type: 'github', connected: true, config: { repos: 'brandication' } },
          ],
          createdAt: new Date(2024, 0, 1).toISOString(),
        },
      ],
    },
    {
      id: '7colours',
      name: '7Colours',
      color: 'danger',
      notes: 'Digital agency & web solutions. Clockify client: Woolooloo (id: 65e1a932e0c924641692565d)',
      createdAt: new Date(2024, 0, 1).toISOString(),
      updatedAt: new Date().toISOString(),
      projects: [
        {
          id: '7c-website',
          name: '7Colours',
          description: '7Colours website & digital presence',
          linearProjectId: '41d95655-0161-49b7-89bb-025b013d1e99',
          linearProjectKey: '7C',
          clockifyProjectId: '6a03984e43c3a07a3016ab48',
          githubRepos: [
            'The-Woolooloo-Company/7colours_website',
          ],
          agentsEnabled: true,
          integrations: [
            { type: 'linear', connected: true, config: { projectId: '41d95655-0161-49b7-89bb-025b013d1e99' } },
            { type: 'clockify', connected: true, config: { projectId: '6a03984e43c3a07a3016ab48' } },
          ],
          createdAt: new Date(2024, 0, 1).toISOString(),
        },
      ],
    },
    {
      id: 'woolooloo',
      name: 'Woolooloo',
      color: 'dark',
      notes: 'Internal tools and OS. Clockify client: Woolooloo (id: 65e1a932e0c924641692565d)',
      createdAt: new Date(2024, 0, 1).toISOString(),
      updatedAt: new Date().toISOString(),
      projects: [
        {
          id: 'woolsapp',
          name: 'WoolsApp',
          description: 'Woolooloo application platform. andrewq works on this project (WhatsApp, Dashboard, AI Chat)',
          linearProjectId: '345aa2f5-b194-4dbe-84a4-f46ece9cd7a2',
          linearProjectKey: 'WA',
          clockifyProjectId: '686d20d53aa1ec7de1560c79', // shared Clockify project with Woolooloo OS — andrewq's time goes here
          githubRepos: [
            'The-Woolooloo-Company/woolsapp',
            'The-Woolooloo-Company/woolooloo-os', // active dev is here (Woolooloo OS code)
          ],
          agentsEnabled: true,
          integrations: [
            { type: 'linear', connected: true, config: { projectId: '345aa2f5-b194-4dbe-84a4-f46ece9cd7a2' } },
            { type: 'clockify', connected: true, config: { projectId: '686d20d53aa1ec7de1560c79' } },
          ],
          createdAt: new Date(2024, 0, 1).toISOString(),
        },
        {
          id: 'woolooloo-os',
          name: 'Woolooloo OS',
          description: 'AI-powered operations center. Code lives in The-Woolooloo-Company/woolooloo-os.',
          linearProjectId: '78cedd46-c15f-45d3-b02d-d20a2593f9d4',
          linearProjectKey: 'WOS',
          clockifyProjectId: '686d20d53aa1ec7de1560c79', // shared with WoolsApp — filter out andrewq entries
          githubRepos: ['The-Woolooloo-Company/woolooloo-os'],
          agentsEnabled: true,
          integrations: [
            { type: 'linear', connected: true, config: { projectId: '78cedd46-c15f-45d3-b02d-d20a2593f9d4' } },
            { type: 'clockify', connected: true, config: { projectId: '686d20d53aa1ec7de1560c79' } },
            { type: 'github', connected: true, config: { repo: 'The-Woolooloo-Company/woolooloo-os' } },
          ],
          createdAt: new Date(2024, 0, 1).toISOString(),
        },
        {
          id: 'woolworks',
          name: 'Woolworks',
          description: 'General Woolooloo development work',
          linearProjectKey: 'WW',
          clockifyProjectId: '686d20d53aa1ec7de1560c79',
          agentsEnabled: true,
          integrations: [
            { type: 'clockify', connected: true, config: { projectId: '686d20d53aa1ec7de1560c79' } },
          ],
          createdAt: new Date(2024, 0, 1).toISOString(),
        },
        {
          id: 'sparc-adhoc',
          name: 'SPARC Adhoc',
          description: 'SPARC ad-hoc activities',
          clockifyProjectId: '65b12fb3a6a2546ee2b9a143',
          agentsEnabled: true,
          integrations: [
            { type: 'clockify', connected: true, config: { projectId: '65b12fb3a6a2546ee2b9a143' } },
          ],
          createdAt: new Date(2024, 0, 1).toISOString(),
        },
        {
          id: 'woolooloo-internal',
          name: 'Woolooloo Internal',
          description: 'Internal operations',
          clockifyProjectId: '6a1003f294f14d8139125db9',
          agentsEnabled: true,
          integrations: [
            { type: 'clockify', connected: true, config: { projectId: '6a1003f294f14d8139125db9' } },
          ],
          createdAt: new Date(2024, 0, 1).toISOString(),
        },
        {
          id: 'onguard',
          name: 'OnGuard',
          description: 'OnGuard project (general)',
          clockifyProjectId: '65e1a932e0c9246416925660',
          agentsEnabled: true,
          integrations: [
            { type: 'clockify', connected: true, config: { projectId: '65e1a932e0c9246416925660' } },
          ],
          createdAt: new Date(2024, 0, 1).toISOString(),
        },
        {
          id: 'onguard-v2',
          name: 'OnGuard v2',
          description: 'OnGuard v2 project',
          clockifyProjectId: '67279c86c8a6d17afff5e695',
          agentsEnabled: true,
          integrations: [
            { type: 'clockify', connected: true, config: { projectId: '67279c86c8a6d17afff5e695' } },
          ],
          createdAt: new Date(2024, 0, 1).toISOString(),
        },
        {
          id: 'icoach-cricket',
          name: 'iCoach Cricket',
          description: 'iCoach Cricket platform',
          clockifyProjectId: '651c0b0d0ca0676d0f43ef78',
          agentsEnabled: true,
          integrations: [
            { type: 'clockify', connected: true, config: { projectId: '651c0b0d0ca0676d0f43ef78' } },
          ],
          createdAt: new Date(2024, 0, 1).toISOString(),
        },
        {
          id: 'icoach-golf',
          name: 'iCoach Golf',
          description: 'iCoach Golf platform',
          clockifyProjectId: '651c0bb0e5fa3b229d9868a2',
          agentsEnabled: true,
          integrations: [
            { type: 'clockify', connected: true, config: { projectId: '651c0bb0e5fa3b229d9868a2' } },
          ],
          createdAt: new Date(2024, 0, 1).toISOString(),
        },
      ],
    },
    {
      id: 'acme-corp',
      name: 'Acme Corp',
      color: 'accent',
      notes: 'Demo client — AI agent chain build. Built by 4-agent chain (Product → Dev → Ops → QA) via MCP tools.',
      createdAt: new Date(2025, 5, 22).toISOString(),
      updatedAt: new Date().toISOString(),
      projects: [
        {
          id: 'acme-dashboard',
          name: 'Acme Corp Dashboard',
          description: 'Dashboard analytics platform. Built by AI agent chain: Product PRD → Dev (MCP tools) → Ops deploy → QA tests. Files in /workspace/acme.',
          linearProjectId: '1df3f041-8ea5-4e21-b8f4-2c2e9a6150c1',
          linearProjectKey: 'ACD',
          githubRepos: ['The-Woolooloo-Company/acme-dashboard'],
          agentsEnabled: true,
          integrations: [
            { type: 'linear', connected: true, config: { projectId: '1df3f041-8ea5-4e21-b8f4-2c2e9a6150c1' } },
          ],
          createdAt: new Date(2025, 5, 22).toISOString(),
        },
      ],
    },
  ];

  saveClients(REAL_CLIENTS);
}
