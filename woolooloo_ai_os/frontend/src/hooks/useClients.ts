import { useState, useEffect, useCallback } from 'react';
import type { Client } from '@/lib/clients';
import { getClients, addClient, updateClient, deleteClient, seedMockClients } from '@/lib/clients';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(() => {
    setLoading(true);
    seedMockClients();
    setClients(getClients());
    setLoading(false);
  }, []);

  const addClientWrapper = useCallback((data: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'projects'>) => {
    const result = addClient(data);
    setClients(getClients());
    return result;
  }, []);

  const updateClientWrapper = useCallback((id: string, updates: Partial<Client>): Client | null => {
    const result = updateClient(id, updates);
    if (result) setClients(getClients());
    return result;
  }, []);

  const deleteClientWrapper = useCallback((id: string) => {
    deleteClient(id);
    setClients(getClients());
  }, []);

  useEffect(() => {
    fetchClients();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'woolooloo-clients' || e.key === null) {
        setClients(getClients());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [fetchClients]);

  return {
    clients,
    loading,
    addClient: addClientWrapper,
    updateClient: updateClientWrapper,
    deleteClient: deleteClientWrapper,
    refresh: fetchClients,
  };
}
