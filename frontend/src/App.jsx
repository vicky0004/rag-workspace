import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { ChatProvider } from './contexts/ChatContext';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import DocumentsPage from './pages/DocumentsPage';
import DashboardPage from './pages/DashboardPage';
import Sidebar from './components/Sidebar';
import './App.css';

function AppContent() {
  const { user, loading } = useAuth();
  const [activePage, setActivePage] = useState('chat');

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
    chat: <ChatPage />,
    documents: <DocumentsPage />,
    dashboard: <DashboardPage />,
  };

  return (
    <WorkspaceProvider>
      <ChatProvider>
        <div className="app-shell">
          <Sidebar activePage={activePage} onNavigate={setActivePage} />
          <main className="app-main">
            {pages[activePage]}
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
