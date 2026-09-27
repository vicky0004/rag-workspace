import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getWorkspaces, createWorkspace, deleteWorkspace as deleteWs } from '../lib/api';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadWorkspaces = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await getWorkspaces();
      setWorkspaces(res.data || []);
      if (res.data?.length > 0 && !activeWorkspace) {
        setActiveWorkspace(res.data[0]);
      }
    } catch (e) {
      console.error('Failed to load workspaces', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const createNew = async (name) => {
    const res = await createWorkspace(name);
    await loadWorkspaces();
    setActiveWorkspace(res.data);
    return res.data;
  };

  const deleteActive = async (id) => {
    await deleteWs(id);
    const remaining = workspaces.filter(w => w.id !== id);
    setWorkspaces(remaining);
    setActiveWorkspace(remaining[0] || null);
  };

  const switchWorkspace = (ws) => setActiveWorkspace(ws);

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      activeWorkspace,
      loading,
      switchWorkspace,
      createNew,
      deleteActive,
      refresh: loadWorkspaces,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return ctx;
}
