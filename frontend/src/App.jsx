import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { ChatProvider } from './contexts/ChatContext';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import DocumentsPage from './pages/DocumentsPage';
import DashboardPage from './pages/DashboardPage';
import Sidebar from './components/Sidebar';
import './App.css';

import { useWorkspace } from './contexts/WorkspaceContext';

function MobileTopBar({ onToggleSidebar, activePage }) {
  const { activeWorkspace } = useWorkspace();
  const pageTitles = {
    chat: 'Chat',
    documents: 'Documents',
    dashboard: 'Statistics',
  };

  return (
    <header className="mobile-topbar">
      <div className="mobile-topbar-left">
        {activeWorkspace?.name ? (
          <div className="mobile-ws-pill" title={`Active workspace: ${activeWorkspace.name}`}>
            <span className="mobile-ws-dot" />
            <span className="mobile-ws-name">{activeWorkspace.name}</span>
          </div>
        ) : (
          <div className="mobile-topbar-placeholder" />
        )}
      </div>

      <div className="mobile-topbar-brand">
        <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="10" fill="#000000"/>
          <path d="M10 28L20 12L30 28" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 22H26" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span className="mobile-topbar-title">{pageTitles[activePage] || 'RAG Workspace'}</span>
      </div>

      <div className="mobile-topbar-right">
        <button
          className="btn-mobile-toggle"
          onClick={onToggleSidebar}
          aria-label="Open sidebar menu"
          id="btn-mobile-sidebar-toggle"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>
    </header>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [activePage, setActivePage] = useState('chat');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [chatFloaterDismissed, setChatFloaterDismissed] = useState(false);

  // Automatically show the chat floater again whenever the user navigates between pages
  useEffect(() => {
    setChatFloaterDismissed(false);
  }, [activePage]);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-logo">
          <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="12" fill="url(#g)"/>
            <path d="M10 28L20 12L30 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 22H26" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1"/><stop offset="1" stopColor="#a855f7"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span className="spinner" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const pages = {
    chat: <ChatPage onNavigate={setActivePage} />,
    documents: <DocumentsPage />,
    dashboard: <DashboardPage />,
  };

  return (
    <WorkspaceProvider>
      <ChatProvider>
        <div className="app-shell">
          <Sidebar
            activePage={activePage}
            onNavigate={setActivePage}
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />
          <main className="app-main">
            <MobileTopBar
              onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              activePage={activePage}
            />
            <div className="app-page-content">
              {pages[activePage]}
            </div>

            {/* Mobile-only Chat Floater button with dismiss cross */}
            {(activePage === 'documents' || activePage === 'dashboard') && !chatFloaterDismissed && (
              <div
                className={`mobile-chat-fab-container ${activePage === 'documents' ? 'mobile-chat-fab-container--docs' : ''}`}
              >
                <button
                  className="mobile-chat-fab"
                  onClick={() => setActivePage('chat')}
                  aria-label="Go to Chat"
                  title="Open Chat"
                  id="btn-mobile-chat-floater"
                >
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span className="mobile-chat-fab-label">Chat</span>
                </button>
                <button
                  className="mobile-chat-fab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    setChatFloaterDismissed(true);
                  }}
                  aria-label="Hide chat button"
                  title="Hide"
                  id="btn-close-chat-floater"
                >
                  ✕
                </button>
              </div>
            )}
          </main>
        </div>
      </ChatProvider>
    </WorkspaceProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
