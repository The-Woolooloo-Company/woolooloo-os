const STAFF_KEY = 'woolooloo-staff';

export type StaffRole = 'developer' | 'designer' | 'manager' | 'lead' | 'support' | 'ai';
export type StaffStatus = 'active' | 'inactive' | 'leave';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  linearUserId?: string;
  linearUserName?: string;
  clockifyUserId?: string;
  clockifyUserName?: string;
  avatar?: string;
  hourlyRate?: number;
  source: 'linear' | 'clockify' | 'manual'; // where they came from
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Storage Helpers ─────────────────────────────────────────

export function getStaff(): StaffMember[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STAFF_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

export function saveStaff(staff: StaffMember[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
}

export function addStaff(data: Omit<StaffMember, 'id' | 'createdAt' | 'updatedAt'>): StaffMember {
  const staff = getStaff();
  const now = new Date().toISOString();
  const newMember: StaffMember = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  staff.push(newMember);
  saveStaff(staff);
  return newMember;
}

export function updateStaff(staffId: string, updates: Partial<StaffMember>): StaffMember | null {
  const staff = getStaff();
  const idx = staff.findIndex(s => s.id === staffId);
  if (idx === -1) return null;
  staff[idx] = { ...staff[idx], ...updates, updatedAt: new Date().toISOString() };
  saveStaff(staff);
  return staff[idx];
}

export function deleteStaff(staffId: string): boolean {
  const staff = getStaff().filter(s => s.id !== staffId);
  saveStaff(staff);
  return true;
}

export function getStaffById(staffId: string): StaffMember | null {
  return getStaff().find(s => s.id === staffId) || null;
}

// ─── Sync Staff from Linear + Clockify ──────────────────────

export async function syncStaffFromApis(): Promise<StaffMember[]> {
  const now = new Date().toISOString();
  const staffMap = new Map<string, StaffMember>();
  
  // Deterministic key: lowercase name for dedup
  const keyFor = (name: string) => name.toLowerCase().trim();

  // 1. Start with existing manual staff (preserve them)
  const existing = getStaff();
  for (const member of existing) {
    if (member.source === 'manual') {
      const k = keyFor(member.name);
      staffMap.set(k, { ...member, updatedAt: now });
    }
  }

  // 2. Fetch from Linear (uses existing linear.ts)
  try {
    const linear = await import('@/lib/linear');
    const linearUsers = await linear.getLinearUsers();
    for (const user of linearUsers) {
      const k = keyFor(user.name);
      const existing = staffMap.get(k) || staffMap.get(k);
      const member: StaffMember = existing || {
        id: crypto.randomUUID(),
        name: user.name,
        email: `${user.name.toLowerCase().replace(/\s+/g, '.')}@woolooloo.co.za`,
        role: 'developer',
        status: 'active',
        linearUserId: user.id,
        linearUserName: user.name,
        source: 'linear',
        createdAt: now,
        updatedAt: now,
      };
      member.name = user.name;
      member.linearUserId = user.id;
      member.linearUserName = user.name;
      member.updatedAt = now;
      member.source = 'linear';
      staffMap.set(k, member);
    }
  } catch (err) {
    console.warn('Failed to sync Linear users:', err);
  }

  // 3. Fetch from Clockify
  try {
    const clockify = await import('@/lib/clockify');
    const clockifyUsers = await clockify.getUsers();
    for (const user of clockifyUsers) {
      const k = keyFor(user.userName);
      let matched = staffMap.get(k);
      if (!matched) {
        // Try matching by email
        const emailMatch = existing.find(s => s.email.toLowerCase() === user.userEmail.toLowerCase());
        if (emailMatch) {
          matched = { ...emailMatch, clockifyUserId: user.id, clockifyUserName: user.userName, updatedAt: now };
        } else {
          const newMember: StaffMember = {
            id: crypto.randomUUID(),
            name: user.userName,
            email: user.userEmail,
            role: 'developer',
            status: 'active',
            clockifyUserId: user.id,
            clockifyUserName: user.userName,
            source: 'clockify',
            createdAt: now,
            updatedAt: now,
          };
          staffMap.set(k, newMember);
          matched = newMember;
        }
      } else {
        matched.clockifyUserId = user.id;
        matched.clockifyUserName = user.userName;
        matched.updatedAt = now;
      }
    }
  } catch (err) {
    console.warn('Failed to sync Clockify users:', err);
  }

  // 4. Ensure Suni Jular exists (manual entry) — only ONE entry
  const suniKey = keyFor('Suni Jular');
  if (!staffMap.has(suniKey)) {
    const suni: StaffMember = {
      id: crypto.randomUUID(),
      name: 'Suni Jular',
      email: 'suni@woolooloo.co.za',
      role: 'developer',
      status: 'active',
      source: 'manual',
      notes: 'Will be added to Clockify',
      createdAt: now,
      updatedAt: now,
    };
    staffMap.set(suniKey, suni);
  }

  const finalStaff = Array.from(staffMap.values());
  saveStaff(finalStaff);
  return finalStaff;
}

// ─── Clockify User Management ──────────────────────────────

// NOTE: Clockify API limitations:
// - You CANNOT remove users from a workspace via API (must do via Clockify UI)
// - You CANNOT disable user seats via API
// - Best approach: manage seats in Clockify web UI, sync to localStorage


