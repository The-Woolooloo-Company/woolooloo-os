const AGENTS_KEY = 'woolooloo-agent-dispatches';
const REVIEWS_KEY = 'woolooloo-reviews';
const IMPROVEMENTS_KEY = 'woolooloo-improvements';

// ─── Agent Dispatch ────────────────────────────────────────

export interface AgentDispatch {
  id: string;
  agentId: string;
  prompt: string;
  projectId?: string;
  projectName?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: string;
  createdAt: string;
  updatedAt: string;
}

export async function dispatchAgent(data: {
  agentId: string;
  prompt: string;
  projectId?: string;
}): Promise<AgentDispatch> {
  const now = new Date().toISOString();
  const dispatch: AgentDispatch = {
    id: crypto.randomUUID(),
    agentId: data.agentId,
    prompt: data.prompt,
    projectId: data.projectId,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  const dispatches = getAgentDispatches();
  dispatches.push(dispatch);
  saveAgentDispatches(dispatches);

  // Simulate agent processing
  dispatch.status = 'running';
  dispatch.updatedAt = new Date().toISOString();
  saveAgentDispatches(dispatches);

  // Call vLLM if configured
  try {
    if (typeof window !== 'undefined') {
      const config = localStorage.getItem('woolooloo-config');
      if (config) {
        const parsed = JSON.parse(config);
        if (parsed.VLLM_HOST) {
          // In production, this would call the actual vLLM endpoint
          const output = `AI Agent (${data.agentId}) processed: ${data.prompt.substring(0, 100)}...`;
          dispatch.output = output;
          dispatch.status = 'completed';
        }
      }
    }
  } catch (err) {
    console.error('vLLM call failed:', err);
    dispatch.status = 'failed';
  }

  dispatch.updatedAt = new Date().toISOString();
  saveAgentDispatches(dispatches);
  return dispatch;
}

export function getAgentDispatches(): AgentDispatch[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(AGENTS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveAgentDispatches(dispatches: AgentDispatch[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AGENTS_KEY, JSON.stringify(dispatches));
}

// ─── Review Checkpoints ────────────────────────────────────

export interface ReviewCheckpoint {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs-changes';
  assignee?: string;
  projectId?: string;
  linearIssueId?: string;
  createdAt: string;
  updatedAt: string;
}

export async function createReview(data: {
  title: string;
  description: string;
  assignee?: string;
  projectId?: string;
}): Promise<ReviewCheckpoint> {
  const now = new Date().toISOString();
  const review: ReviewCheckpoint = {
    id: crypto.randomUUID(),
    title: data.title,
    description: data.description,
    assignee: data.assignee,
    projectId: data.projectId,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  const reviews = getReviews();
  reviews.push(review);
  saveReviews(reviews);

  // Create Linear issue for the review
  try {
    if (typeof window !== 'undefined') {
      const config = localStorage.getItem('woolooloo-config');
      if (config) {
        const parsed = JSON.parse(config);
        if (parsed.LINEAR_API_KEY) {
          // In production, create a Linear issue
          console.log('Would create Linear issue:', review);
        }
      }
    }
  } catch (err) {
    console.error('Failed to create Linear issue:', err);
  }

  return review;
}

export function getReviews(): ReviewCheckpoint[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(REVIEWS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

// Alias for audit page compatibility
export const getReviewCheckpoints = getReviews;

function saveReviews(reviews: ReviewCheckpoint[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
}

export function updateReview(reviewId: string, status: ReviewCheckpoint['status']): ReviewCheckpoint | null {
  const reviews = getReviews();
  const idx = reviews.findIndex(r => r.id === reviewId);
  if (idx === -1) return null;
  reviews[idx].status = status;
  reviews[idx].updatedAt = new Date().toISOString();
  saveReviews(reviews);
  return reviews[idx];
}

// ─── Improvement Tracking ──────────────────────────────────

export interface ImprovementLog {
  id: string;
  agentId: string;
  metric: string;
  before: number;
  after: number;
  improvement: number;
  notes?: string;
  createdAt: string;
}

export function logImprovement(data: {
  agentId: string;
  metric: string;
  before: number;
  after: number;
  notes?: string;
}): ImprovementLog {
  const now = new Date().toISOString();
  const improvement: ImprovementLog = {
    id: crypto.randomUUID(),
    agentId: data.agentId,
    metric: data.metric,
    before: data.before,
    after: data.after,
    improvement: Math.round(((data.after - data.before) / Math.max(data.before, 1)) * 100),
    notes: data.notes,
    createdAt: now,
  };

  const logs = getImprovements();
  logs.push(improvement);
  saveImprovements(logs);
  return improvement;
}

export function getImprovements(): ImprovementLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(IMPROVEMENTS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveImprovements(logs: ImprovementLog[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(IMPROVEMENTS_KEY, JSON.stringify(logs));
}

// ─── Mock Data (only for demo) ─────────────────────────────

export function seedMockAgentData(): void {
  const existing = getAgentDispatches();
  if (existing.length > 0) return;

  const mocks: AgentDispatch[] = [
    {
      id: crypto.randomUUID(),
      agentId: 'dev',
      prompt: 'Fix the login redirect bug',
      projectId: 'woolooloo-os',
      projectName: 'Woolooloo OS',
      status: 'completed',
      output: 'Fixed SSO redirect URL in auth middleware',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3600 * 1000).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      agentId: 'product',
      prompt: 'Draft sprint plan for Q1',
      projectId: 'ns-onguard',
      projectName: 'On-guard',
      status: 'completed',
      output: 'Sprint plan drafted with 12 story points',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 7200 * 1000).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      agentId: 'growth',
      prompt: 'Create email campaign for NS Clear',
      projectId: 'ns-clear',
      projectName: 'NS Clear',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  saveAgentDispatches(mocks);
}
