import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useChat } from '../contexts/ChatContext';
import WorkspaceModal from './WorkspaceModal';
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
  const { workspaces, activeWorkspace, switchWorkspace, loading: wsLoading } = useWorkspace();
  const {
    sessions,
    activeSessionId,
    selectSession,
    startNewChat,
    renameSession,
    deleteSession,
  } = useChat();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [openMenuSessionId, setOpenMenuSessionId] = useState(null);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [renameInput, setRenameInput] = useState('');

  const dropdownRef = useRef(null);
  const historyMenuRef = useRef(null);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (historyMenuRef.current && !historyMenuRef.current.contains(e.target)) {
        setOpenMenuSessionId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setModalOpen(true);
    setDropdownOpen(false);
  };

  const openManageModal = () => {
    setModalMode('manage');
    setModalOpen(true);
    setDropdownOpen(false);
  };

  const handleSelectChat = (sessionId) => {
    selectSession(sessionId);
    onNavigate('chat');
  };

  const handleNewChat = async () => {
    await startNewChat();
    onNavigate('chat');
  };

  const handleStartRename = (session, e) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setRenameInput(session.title);
    setOpenMenuSessionId(null);
  };

  const handleSaveRename = async (sessionId, e) => {
    if (e) e.stopPropagation();
    if (!renameInput.trim()) return;
    await renameSession(sessionId, renameInput.trim());
    setEditingSessionId(null);
  };

  const handleDeleteChat = async (session, e) => {
    e.stopPropagation();
    setOpenMenuSessionId(null);
    await deleteSession(session.id, session.title);
  };

  return (
    <>
      <aside className="sidebar">
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-logo">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="url(#brand-grad)"/>
              <path d="M10 28L20 12L30 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 22H26" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <defs>
                <linearGradient id="brand-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1"/><stop offset="1" stopColor="#a855f7"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-title">RAG Assistant</span>
            <span className="brand-subtitle">Smart Documents</span>
          </div>
        </div>

        {/* Workspace Selector Dropdown */}
        <div className="workspace-selector-container" ref={dropdownRef}>
          <div className="workspace-header-label">Workspace</div>
          <button
            className={`workspace-trigger ${dropdownOpen ? 'workspace-trigger--open' : ''}`}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            id="btn-workspace-trigger"
          >
            <div className="ws-avatar">
              {activeWorkspace?.name ? activeWorkspace.name.slice(0, 2).toUpperCase() : 'WS'}
            </div>
            <div className="ws-trigger-info">
              <span className="ws-trigger-name">{activeWorkspace?.name || (wsLoading ? 'Loading…' : 'Select Workspace')}</span>
              <span className="ws-trigger-count">{workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}</span>
            </div>
            <svg className={`ws-chevron ${dropdownOpen ? 'ws-chevron--open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="workspace-dropdown-menu">
              <div className="dropdown-section-title">All Workspaces</div>
              <div className="dropdown-ws-list">
                {workspaces.map(ws => {
                  const isActive = activeWorkspace?.id === ws.id;
                  return (
                    <button
                      key={ws.id}
                      className={`dropdown-ws-item ${isActive ? 'dropdown-ws-item--active' : ''}`}
                      onClick={() => {
                        switchWorkspace(ws);
                        setDropdownOpen(false);
                      }}
                    >
                      <span className="dropdown-ws-dot" />
                      <span className="dropdown-ws-name">{ws.name}</span>
                      {isActive && (
                        <svg className="dropdown-ws-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="dropdown-divider" />

              <div className="dropdown-actions">
                <button className="dropdown-action-btn" onClick={openCreateModal} id="btn-dropdown-create-ws">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  <span>New Workspace</span>
                </button>
                <button className="dropdown-action-btn" onClick={openManageModal} id="btn-dropdown-manage-ws">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  <span>Manage Workspaces</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id && (item.id !== 'chat' || !activeSessionId) ? 'nav-item--active' : ''}`}
              onClick={() => {
                if (item.id === 'chat') {
                  startNewChat();
                }
                onNavigate(item.id);
              }}
              id={`nav-${item.id}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Chat History Section (Below Navigation) */}
        <div className="sidebar-history-section" ref={historyMenuRef}>
          <div className="history-header">
            <span className="history-section-label">Chat History</span>
            <button
              className="btn-new-chat-icon"
              onClick={handleNewChat}
              title="Start new chat"
              id="btn-new-chat"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>

          <div className="history-list">
            {sessions.length === 0 ? (
              <p className="history-empty">No previous chats</p>
            ) : (
              sessions.map(session => {
                const isActive = activePage === 'chat' && activeSessionId === session.id;
                const isEditing = editingSessionId === session.id;
                const isMenuOpen = openMenuSessionId === session.id;

                if (isEditing) {
                  return (
                    <div key={session.id} className="history-item history-item--editing">
                      <input
                        type="text"
                        value={renameInput}
                        onChange={e => setRenameInput(e.target.value)}
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveRename(session.id, e);
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                        onClick={e => e.stopPropagation()}
                        className="history-rename-input"
                      />
                      <button
                        className="btn-icon btn-icon--save btn-icon-xs"
                        onClick={e => handleSaveRename(session.id, e)}
                        title="Save"
                      >
                        ✓
                      </button>
                      <button
                        className="btn-icon btn-icon-xs"
                        onClick={e => { e.stopPropagation(); setEditingSessionId(null); }}
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={session.id}
                    className={`history-item ${isActive ? 'history-item--active' : ''}`}
                    onClick={() => handleSelectChat(session.id)}
                    title={session.title}
                  >
                    <svg className="history-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span className="history-title">{session.title}</span>

                    {/* Three dots button */}
                    <div className="history-actions" onClick={e => e.stopPropagation()}>
                      <button
                        className={`history-dots-btn ${isMenuOpen ? 'history-dots-btn--open' : ''}`}
                        onClick={e => {
                          e.stopPropagation();
                          setOpenMenuSessionId(isMenuOpen ? null : session.id);
                        }}
                        title="Options"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/>
                        </svg>
                      </button>

                      {/* Three-dots menu (Only Rename and Delete) */}
                      {isMenuOpen && (
                        <div className="history-menu-popover">
                          <button
                            className="history-menu-item"
                            onClick={e => handleStartRename(session, e)}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            <span>Rename</span>
                          </button>
                          <button
                            className="history-menu-item history-menu-item--danger"
                            onClick={e => handleDeleteChat(session, e)}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M10 11v6M14 11v6"/>
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Action in Sidebar */}
        <div className="sidebar-quick-action">
          <button className="btn-new-ws-sidebar" onClick={openCreateModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>Create Workspace</span>
          </button>
        </div>

        {/* User Footer */}
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.email?.[0]?.toUpperCase()}</div>
            <div className="user-meta">
              <span className="user-email">{user?.email}</span>
              <span className="user-plan">Free Workspace</span>
            </div>
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

      {/* Workspace Management / Creation Modal */}
      <WorkspaceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultMode={modalMode}
      />
    </>
  );
}
