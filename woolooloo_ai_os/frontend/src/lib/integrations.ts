export interface IntegrationField {
  key: string;
  label: string;
  type: "text" | "password";
}

export interface IntegrationToggleField {
  key: string;
  label: string;
  type: "toggle";
}

export interface IntegrationDefinition {
  name: string;
  description: string;
  icon: string;
  fields: IntegrationField[];
  extraFields?: IntegrationToggleField[];
  info?: string;
}

export const integrations: IntegrationDefinition[] = [
  {
    name: "GitHub",
    description: "Code repository and pull requests",
    icon: "code",
    fields: [
      { key: "GITHUB_TOKEN", label: "Personal Access Token", type: "password" },
      { key: "GITHUB_OWNER", label: "Organization/User", type: "text" },
      { key: "GITHUB_REPO", label: "Repository Name", type: "text" },
    ],
  },
  {
    name: "Linear",
    description: "Task management and issue tracking",
    icon: "edit_note",
    fields: [
      { key: "LINEAR_API_KEY", label: "API Key", type: "password" },
      { key: "LINEAR_WEBHOOK_SECRET", label: "Webhook Secret", type: "password" },
    ],
    extraFields: [
      { key: "LINEAR_SYNC_PROJECTS", label: "Auto-sync Projects", type: "toggle" },
    ],
    info: "Fetches projects across all teams. Task ID format: LIN-XXX",
  },
  {
    name: "Clockify",
    description: "Time tracking with Linear integration",
    icon: "schedule",
    fields: [
      { key: "CLOCKIFY_API_KEY", label: "API Key", type: "password" },
      { key: "CLOCKIFY_WORKSPACE_ID", label: "Workspace ID", type: "text" },
    ],
    info: "Link tasks by including Linear ID in description (e.g., 'LIN-123: Task title')",
  },
  {
    name: "LinkedIn",
    description: "Professional networking and lead generation",
    icon: "language",
    fields: [
      { key: "LINKEDIN_CLIENT_ID", label: "Client ID", type: "password" },
      { key: "LINKEDIN_CLIENT_SECRET", label: "Client Secret", type: "password" },
      { key: "LINKEDIN_REDIRECT_URI", label: "Redirect URI", type: "text" },
    ],
    info: "Connect to create sponsored content and import leads",
  },
  {
    name: "Google Ads",
    description: "Search and display advertising campaigns",
    icon: "ads_click",
    fields: [
      { key: "GOOGLE_ADS_CUSTOMER_ID", label: "Customer ID", type: "text" },
      { key: "GOOGLE_ADS_DEVELOPER_TOKEN", label: "Developer Token", type: "password" },
      { key: "GOOGLE_ADS_REFRESH_TOKEN", label: "Refresh Token", type: "password" },
      { key: "GOOGLE_ADS_CLIENT_SECRET", label: "Client Secret", type: "password" },
      { key: "GOOGLE_ADS_CLIENT_ID", label: "Client ID", type: "password" },
    ],
    info: "Manage search campaigns, keywords, and bid strategies",
  },
  {
    name: "Notion",
    description: "Knowledge base and documentation",
    icon: "article",
    fields: [
      { key: "NOTION_API_KEY", label: "API Key", type: "password" },
      { key: "NOTION_FOUNDER_INBOX_ID", label: "Founder Inbox DB ID", type: "text" },
      { key: "NOTION_CAMPAIGNS_DB_ID", label: "Campaigns DB ID", type: "text" },
    ],
  },
  {
    name: "Slack",
    description: "Team communication and notifications",
    icon: "chat",
    fields: [
      { key: "SLACK_BOT_TOKEN", label: "Bot Token", type: "password" },
      { key: "SLACK_SIGNING_SECRET", label: "Signing Secret", type: "password" },
    ],
  },
  {
    name: "WhatsApp",
    description: "External communication via Twilio",
    icon: "sms",
    fields: [
      { key: "TWILIO_ACCOUNT_SID", label: "Account SID", type: "password" },
      { key: "TWILIO_AUTH_TOKEN", label: "Auth Token", type: "password" },
      { key: "TWILIO_WHATSAPP_FROM", label: "From Number", type: "text" },
    ],
  },
  {
    name: "Xero",
    description: "Accounting and payment tracking",
    icon: "account_balance",
    fields: [
      { key: "XERO_CLIENT_ID", label: "Client ID", type: "password" },
      { key: "XERO_CLIENT_SECRET", label: "Client Secret", type: "password" },
      { key: "XERO_TENANT_ID", label: "Tenant ID", type: "text" },
    ],
  },
  {
    name: "vLLM",
    description: "Local LLM inference (Qwen3.5-27B)",
    icon: "psychology",
    fields: [
      { key: "VLLM_HOST", label: "Host URL", type: "text" },
      { key: "VLLM_MODEL", label: "Model", type: "text" },
      { key: "VLLM_API_KEY", label: "API Key", type: "password" },
    ],
    info: "Sets the backend API base used by agents. Value saved in Config is read at runtime.",
  },
  {
    name: "Bitbucket",
    description: "Source code repositories",
    icon: "code",
    fields: [
      { key: "BITBUCKET_APP_KEY", label: "App Key", type: "text" },
      { key: "BITBUCKET_CONSUMER_KEY", label: "Consumer Key", type: "text" },
      { key: "BITBUCKET_CONSUMER_SECRET", label: "Consumer Secret", type: "password" },
      { key: "BITBUCKET_WORKSPACE", label: "Workspace ID", type: "text" },
    ],
    info: "Global default — can be overridden per client on their detail page",
  },
  {
    name: "Jira",
    description: "Issue tracking and project management",
    icon: "edit_note",
    fields: [
      { key: "JIRA_EMAIL", label: "Email", type: "text" },
      { key: "JIRA_API_TOKEN", label: "API Token", type: "password" },
      { key: "JIRA_DOMAIN", label: "Domain (e.g. myorg.atlassian.net)", type: "text" },
    ],
    info: "Fetches issues and boards. Can be linked to client projects",
  },
  {
    name: "Confluence",
    description: "Knowledge base and documentation",
    icon: "article",
    fields: [
      { key: "CONFLUENCE_EMAIL", label: "Email", type: "text" },
      { key: "CONFLUENCE_API_TOKEN", label: "API Token", type: "password" },
      { key: "CONFLUENCE_DOMAIN", label: "Domain (e.g. myorg.atlassian.net)", type: "text" },
    ],
    info: "Access client documentation spaces",
  },
];
