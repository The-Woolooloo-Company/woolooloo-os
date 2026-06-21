const PERMISSIONS_KEY = 'woolooloo-permissions';

export type PageId =
  | 'dashboard' | 'clients' | 'workspace' | 'agents' | 'reports'
  | 'tasks' | 'time-tracking' | 'staff' | 'wiki' | 'staging' | 'config'
  | 'audit' | 'leads' | 'campaigns';

export interface AllPageDef {
  id: PageId;
  label: string;
  path: string;
  icon: string;
  category: 'main' | 'ops' | 'more';
}

export const ALL_PAGES: AllPageDef[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: 'dashboard', category: 'main' },
  { id: 'clients', label: 'Clients', path: '/clients', icon: 'groups', category: 'main' },
  { id: 'workspace', label: 'Workspace', path: '/workspace', icon: 'workspace_premium', category: 'main' },
  { id: 'agents', label: 'Agents', path: '/agents', icon: 'psychology', category: 'main' },
  { id: 'reports', label: 'Reports', path: '/reports', icon: 'assessment', category: 'main' },
  { id: 'tasks', label: 'Tasks', path: '/tasks', icon: 'checklist', category: 'ops' },
  { id: 'time-tracking', label: 'Time Tracking', path: '/time-tracking', icon: 'schedule', category: 'ops' },
  { id: 'staff', label: 'Staff', path: '/staff', icon: 'badge', category: 'ops' },
  { id: 'wiki', label: 'Wiki', path: '/wiki', icon: 'auto_stories', category: 'more' },
  { id: 'staging', label: 'Staging', path: '/staging', icon: 'cloud', category: 'more' },
  { id: 'config', label: 'Config', path: '/config', icon: 'settings', category: 'more' },
  { id: 'audit', label: 'Audit', path: '/audit', icon: 'receipt_long', category: 'more' },
  { id: 'leads', label: 'Leads', path: '/leads', icon: 'person_add', category: 'more' },
  { id: 'campaigns', label: 'Campaigns', path: '/campaigns', icon: 'campaign', category: 'more' },
];

export interface UserPermissions {
  username: string;
  isAdmin: boolean;
  enabledPages: PageId[];
}

export const ROLE_PRESETS: Record<string, PageId[]> = {
  admin: ALL_PAGES.map(p => p.id),
  manager: ['dashboard', 'clients', 'workspace', 'reports', 'tasks', 'time-tracking', 'staff', 'leads', 'campaigns'],
  member: ['dashboard', 'clients', 'workspace', 'tasks', 'time-tracking'],
  viewer: ['dashboard', 'clients'],
};

export function getUserPermissions(username: string): UserPermissions | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(PERMISSIONS_KEY);
    const allPermissions: UserPermissions[] = saved ? JSON.parse(saved) : [];
    return allPermissions.find(p => p.username === username) || null;
  } catch { return null; }
}

export function getAllPermissions(): UserPermissions[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(PERMISSIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

export function saveAllPermissions(permissions: UserPermissions[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions));
}

export function updateUserPermissions(username: string, updates: Partial<UserPermissions>): UserPermissions | null {
  const all = getAllPermissions();
  const idx = all.findIndex(p => p.username === username);
  if (idx === -1) {
    const newPerm: UserPermissions = { username, isAdmin: false, enabledPages: updates.enabledPages || [], ...updates };
    all.push(newPerm);
    saveAllPermissions(all);
    return newPerm;
  }
  all[idx] = { ...all[idx], ...updates };
  saveAllPermissions(all);
  return all[idx];
}

export function deleteUserPermissions(username: string): void {
  saveAllPermissions(getAllPermissions().filter(p => p.username !== username));
}

export function hasPageAccess(username: string, pageId: PageId): boolean {
  const perm = getUserPermissions(username);
  if (!perm) return false;
  if (perm.isAdmin) return true;
  return perm.enabledPages.includes(pageId);
}

export function getUserPages(username: string): AllPageDef[] {
  const perm = getUserPermissions(username);
  if (perm) {
    if (perm.isAdmin) return ALL_PAGES;
    return ALL_PAGES.filter(p => perm.enabledPages.includes(p.id));
  }
  // No permissions entry yet — check session for admin status
  const sessionData = localStorage.getItem('woolooloo-session');
  try {
    const session = JSON.parse(sessionData || '{}');
    if (session?.username === username && session?.isAdmin) {
      // Auto-grant admin pages, but don't create a permission record here
      return ALL_PAGES;
    }
  } catch {}
  return [];
}

export function applyRolePreset(username: string, preset: string): UserPermissions | null {
  const pages = ROLE_PRESETS[preset] || [];
  return updateUserPermissions(username, { enabledPages: pages });
}

export function getPageIdForPath(path: string): PageId | null {
  const page = ALL_PAGES.find(p => path === p.path || path.startsWith(p.path + '/'));
  return page ? page.id : null;
}
