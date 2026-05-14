import { useState, useEffect, useCallback } from 'react';
import type { StaffMember } from '@/lib/staff';
import { getStaff, addStaff, updateStaff, deleteStaff, syncStaffFromApis } from '@/lib/staff';

export function useStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = useCallback(() => {
    setLoading(true);
    // Sync from Linear + Clockify APIs
    syncStaffFromApis()
      .then(staff => setStaff(staff))
      .catch(() => setStaff(getStaff()))
      .finally(() => setLoading(false));
  }, []);

  const addStaffWrapper = useCallback((data: Omit<StaffMember, 'id' | 'createdAt' | 'updatedAt'>) => {
    const result = addStaff(data);
    setStaff(getStaff());
    return result;
  }, []);

  const updateStaffWrapper = useCallback((id: string, updates: Partial<StaffMember>): StaffMember | null => {
    const result = updateStaff(id, updates);
    if (result) setStaff(getStaff());
    return result;
  }, []);

  const deleteStaffWrapper = useCallback((id: string) => {
    deleteStaff(id);
    setStaff(getStaff());
  }, []);

  useEffect(() => {
    fetchStaff();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'woolooloo-staff' || e.key === null) {
        setStaff(getStaff());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [fetchStaff]);

  return {
    staff,
    loading,
    addStaff: addStaffWrapper,
    updateStaff: updateStaffWrapper,
    deleteStaff: deleteStaffWrapper,
    refresh: fetchStaff,
  };
}
