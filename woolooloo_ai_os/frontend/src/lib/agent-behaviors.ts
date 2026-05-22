// Agent behavior definitions — what each agent does automatically
// Behaviors are triggered by events (e.g., after writing a file, dev agent commits)

export interface AgentBehavior {
  name: string;
  description: string;
  // Which events trigger this behavior
  triggers: string[];
  // The tool(s) to execute when triggered
  action: { tool: string; args: Record<string, any> };
  // Condition: only run if condition is met
  condition?: (context: Record<string, any>) => boolean;
}

// ─── Dev Agent Behaviors ─────────────────────────────────────────
export const DEV_BEHAVIORS: AgentBehavior[] = [
  {
    name: 'auto_commit',
    description: 'Auto-commit after writing files',
    triggers: ['file_written', 'file_created', 'file_deleted'],
    action: {
      tool: 'git_commit',
      args: { message: 'chore(agent): auto-commit by dev agent' },
    },
    condition: (ctx) => ctx.hasChanges === true,
  },
  {
    name: 'auto_push',
    description: 'Push commits after auto-commit',
    triggers: ['commit_made'],
    action: { tool: 'git_push', args: {} },
  },
  {
    name: 'create_linear_task_on_feature',
    description: 'Create a Linear task when starting a new feature',
    triggers: ['feature_started'],
    action: { tool: 'linear_create_task', args: { title: 'feature: {{feature_name}}', projectId: '{{project_id}}' } },
    condition: (ctx) => ctx.feature_name && ctx.project_id,
  },
];

// ─── Product Agent Behaviors ─────────────────────────────────────
export const PRODUCT_BEHAVIORS: AgentBehavior[] = [
  {
    name: 'create_tasks_from_requirements',
    description: 'Create Linear tasks from user requirements',
    triggers: ['requirements_received'],
    action: {
      tool: 'linear_create_task',
      args: { title: 'req: {{requirement}}', projectId: '{{project_id}}', priority: 2 },
    },
  },
];

// ─── Ops Agent Behaviors ─────────────────────────────────────────
export const OPS_BEHAVIORS: AgentBehavior[] = [
  {
    name: 'post_deploy_test',
    description: 'Run tests after deployment',
    triggers: ['deploy_completed'],
    action: {
      tool: 'deploy_run_tests',
      args: { url: '{{deploy_url}}', paths: ['/', '/agents', '/workspace', '/reports'] },
    },
  },
  {
    name: 'pre_deploy_status',
    description: 'Check status before deploying',
    triggers: ['deploy_started'],
    action: { tool: 'deploy_status', args: { url: '{{deploy_url}}' } },
  },
];

// ─── Growth Agent Behaviors ──────────────────────────────────────
export const GROWTH_BEHAVIORS: AgentBehavior[] = [
  {
    name: 'write_content_to_file',
    description: 'Save generated content to workspace',
    triggers: ['content_generated'],
    action: {
      tool: 'fs_write_file',
      args: { path: '{{content_path}}', content: '{{content}}' },
    },
    condition: (ctx) => ctx.content_path && ctx.content,
  },
];

// ─── Founder Agent Behaviors ─────────────────────────────────────
export const FOUNDER_BEHAVIORS: AgentBehavior[] = [
  {
    name: 'report_progress_to_linear',
    description: 'Create progress update tasks',
    triggers: ['milestone_reached'],
    action: {
      tool: 'linear_create_task',
      args: { title: 'milestone: {{milestone}}', projectId: '{{project_id}}', priority: 1 },
    },
  },
];

// ─── QA Agent Behaviors ──────────────────────────────────────────
export const QA_BEHAVIORS: AgentBehavior[] = [
  {
    name: 'create_github_issue_on_bug',
    description: 'Create GitHub issue when a bug is found',
    triggers: ['bug_found'],
    action: {
      tool: 'github_create_issue',
      args: { repo: '{{repo}}', title: 'bug: {{bug_title}}', body: '{{bug_description}}', labels: ['bug'] },
    },
  },
];

// ─── All behaviors by agent ──────────────────────────────────────
export const AGENT_BEHAVIORS: Record<string, AgentBehavior[]> = {
  dev: DEV_BEHAVIORS,
  product: PRODUCT_BEHAVIORS,
  ops: OPS_BEHAVIORS,
  growth: GROWTH_BEHAVIORS,
  founder: FOUNDER_BEHAVIORS,
  qa: QA_BEHAVIORS,
};

export function getBehaviorsForAgent(agentId: string): AgentBehavior[] {
  return AGENT_BEHAVIORS[agentId] || [];
}
