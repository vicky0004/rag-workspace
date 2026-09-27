import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import './Sidebar.css';

const NAV_ITEMS = [
  {
    id: 'chat',
    label: 'Chat',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    ),
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
];

export default function Sidebar({ activePage, onNavigate }) {
  const { user, signOut } = useAuth();
  const { workspaces, activeWorkspace, switchWorkspace, createNew, loading } = useWorkspace();
  const [newWsName, setNewWsName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showNewWs, setShowNewWs] = useState(false);

  const handleCreateWs = async (e) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    setCreating(true);
    try {
      await createNew(newWsName.trim());
      setNewWsName('');
      setShowNewWs(false);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="10" fill="url(#grad2)"/>
          <path d="M10 28L20 12L30 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 22H26" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <defs>
            <linearGradient id="grad2" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366f1"/><stop offset="1" stopColor="#a855f7"/>
            </linearGradient>
          </defs>
        </svg>
        <span>RAG Workspace</span>
      </div>

      {/* Workspace switcher */}
      <div className="ws-section">
        <div className="ws-section-header">
          <span>Workspaces</span>
          <button
            className="ws-add-btn"
            onClick={() => setShowNewWs(!showNewWs)}
            title="New workspace"
            id="btn-new-workspace"
          >+</button>
        </div>

        {showNewWs && (
          <form onSubmit={handleCreateWs} className="new-ws-form">
            <input
              type="text"
              value={newWsName}
              onChange={e => setNewWsName(e.target.value)}
              placeholder="Workspace name"
              autoFocus
              id="input-workspace-name"
            />
            <button type="submit" className="btn-primary btn-sm" disabled={creating || !newWsName.trim()}>
              {creating ? <span className="spinner spinner--sm" /> : 'Create'}
            </button>
          </form>
        )}

        <div className="ws-list">
          {loading && <div className="ws-loading"><span className="spinner spinner--sm" /></div>}
          {workspaces.map(ws => (
            <button
              key={ws.id}
              className={`ws-item ${activeWorkspace?.id === ws.id ? 'ws-item--active' : ''}`}
              onClick={() => switchWorkspace(ws)}
              id={`btn-workspace-${ws.id}`}
            >
              <span className="ws-dot" />
              <span className="ws-name">{ws.name}</span>
            </button>
          ))}
          {!loading && workspaces.length === 0 && (
            <p className="ws-empty">No workspaces yet</p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activePage === item.id ? 'nav-item--active' : ''}`}
            onClick={() => onNavigate(item.id)}
            id={`nav-${item.id}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User / sign out */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{user?.email?.[0]?.toUpperCase()}</div>
          <span className="user-email">{user?.email}</span>
        </div>
        <button className="signout-btn" onClick={signOut} title="Sign out" id="btn-sign-out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}
