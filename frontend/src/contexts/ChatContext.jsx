import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getChatSessions, createChatSession, renameChatSession, deleteChatSession } from '../lib/api';
import { useWorkspace } from './WorkspaceContext';
import { showToast, showConfirmDialog } from '../lib/alerts';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { activeWorkspace, initialLoaded: wsInitialLoaded } = useWorkspace();
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!activeWorkspace) {
      setSessions([]);
      setActiveSessionId(null);
      setLoading(false);
      if (wsInitialLoaded) {
        setInitialLoaded(true);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await getChatSessions(activeWorkspace.id);
      const list = res.data || [];
      setSessions(list);
      setActiveSessionId(prev => {
        if (prev && list.some(s => s.id === prev)) return prev;
        return null;
      });
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  }, [activeWorkspace?.id, wsInitialLoaded]);

  useEffect(() => {
    if (!wsInitialLoaded) {
      setInitialLoaded(false);
      return;
    }
    if (!activeWorkspace) {
      setSessions([]);
      setActiveSessionId(null);
      setLoading(false);
      setInitialLoaded(true);
      return;
    }
    loadSessions();
  }, [loadSessions, wsInitialLoaded, activeWorkspace]);

  const selectSession = (sessionId) => {
    setActiveSessionId(sessionId);
  };

  const startNewChat = () => {
    setActiveSessionId(null);
  };

  const renameSession = async (sessionId, newTitle) => {
    if (!activeWorkspace || !newTitle.trim()) return;
    try {
      const res = await renameChatSession(activeWorkspace.id, sessionId, newTitle.trim());
      const updated = res.data;
      setSessions(prev => prev.map(s => s.id === sessionId ? updated : s));
      showToast({ title: 'Chat renamed successfully' });
      return updated;
    } catch (err) {
      console.error('Failed to rename chat session:', err);
      showToast({ title: 'Failed to rename chat', icon: 'error' });
    }
  };

  const deleteSession = async (sessionId, sessionTitle) => {
    if (!activeWorkspace) return;

    const confirmed = await showConfirmDialog({
      title: `Delete chat history?`,
      text: sessionTitle ? `"${sessionTitle}" will be permanently removed.` : 'All messages in this chat will be deleted.',
      confirmText: 'Yes, delete chat',
      cancelText: 'Cancel',
      danger: true,
    });

    if (!confirmed) return;

    try {
      await deleteChatSession(activeWorkspace.id, sessionId);
      setSessions(prev => {
        const remaining = prev.filter(s => s.id !== sessionId);
        setActiveSessionId(curr => {
          if (curr === sessionId) return remaining[0]?.id || null;
          return curr;
        });
        return remaining;
      });
      showToast({ title: 'Chat history deleted', icon: 'info' });
    } catch (err) {
      console.error('Failed to delete chat session:', err);
      showToast({ title: 'Failed to delete chat', icon: 'error' });
    }
  };

  const updateSessionFromMessage = (sessionId, autoTitle) => {
    setSessions(prev => {
      const existing = prev.find(s => s.id === sessionId);
      if (existing) {
        return prev.map(s => s.id === sessionId ? {
          ...s,
          title: autoTitle || s.title,
          updated_at: new Date().toISOString(),
        } : s);
      }
      return [{
        id: sessionId,
        title: autoTitle || 'New Chat',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, ...prev];
    });
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  return (
    <ChatContext.Provider value={{
      sessions,
      activeSessionId,
      activeSession,
      loading,
      initialLoaded,
      selectSession,
      startNewChat,
      renameSession,
      deleteSession,
      updateSessionFromMessage,
      refreshSessions: loadSessions,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
}
