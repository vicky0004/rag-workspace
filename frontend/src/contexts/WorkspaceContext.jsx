import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getWorkspaces, createWorkspace, renameWorkspace, deleteWorkspace } from '../lib/api';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const loadWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setLoading(false);
      setInitialLoaded(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getWorkspaces();
      const list = res.data || [];
      setWorkspaces(list);
      setActiveWorkspace(prev => {
        if (!prev && list.length > 0) return list[0];
        if (prev) {
          const found = list.find(w => w.id === prev.id);
          return found || list[0] || null;
        }
        return list[0] || null;
      });
    } catch (e) {
      console.error('Failed to load workspaces', e);
      setWorkspaces([]);
      setActiveWorkspace(null);
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    setInitialLoaded(false);
    loadWorkspaces();
  }, [loadWorkspaces]);

  const createNew = async (name) => {
    const res = await createWorkspace(name);
    const newWs = res.data;
    setWorkspaces(prev => [...prev, newWs]);
    setActiveWorkspace(newWs);
    return newWs;
  };

  const renameWs = async (id, name) => {
    const res = await renameWorkspace(id, name);
    const updated = res.data;
    setWorkspaces(prev => prev.map(w => w.id === id ? updated : w));
    setActiveWorkspace(prev => prev?.id === id ? updated : prev);
    return updated;
  };

  const deleteWs = async (id) => {
    await deleteWorkspace(id);
    setWorkspaces(prev => {
      const remaining = prev.filter(w => w.id !== id);
      setActiveWorkspace(curr => {
        if (curr?.id === id) {
          return remaining[0] || null;
        }
        return curr;
      });
      return remaining;
    });
  };

  const switchWorkspace = (ws) => setActiveWorkspace(ws);

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      activeWorkspace,
      loading,
      initialLoaded,
      switchWorkspace,
      createNew,
      renameWs,
      deleteWs,
      deleteActive: deleteWs,
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
