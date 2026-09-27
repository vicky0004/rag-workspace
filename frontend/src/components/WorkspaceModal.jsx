import { useState } from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import './WorkspaceModal.css';

export default function WorkspaceModal({ isOpen, onClose, defaultMode = 'create' }) {
  const { workspaces, activeWorkspace, switchWorkspace, createNew, renameWs, deleteWs } = useWorkspace();
  const [mode, setMode] = useState(defaultMode); // 'create' | 'manage'
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      await createNew(name.trim());
      setName('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleStartRename = (ws) => {
    setEditingId(ws.id);
    setEditName(ws.name);
  };

  const handleSaveRename = async (wsId) => {
    if (!editName.trim()) return;
    try {
      await renameWs(wsId, editName.trim());
      setEditingId(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to rename workspace');
    }
  };

  const handleDelete = async (wsId, wsName) => {
    if (workspaces.length <= 1) {
      setError('You must keep at least one workspace.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${wsName}"? All documents, tasks, and chat history in this workspace will be deleted.`)) {
      return;
    }
    try {
      await deleteWs(wsId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete workspace');
    }
  };

  return (
    <div className="ws-modal-backdrop" onClick={onClose}>
      <div className="ws-modal" onClick={e => e.stopPropagation()}>
        {/* Header with Tabs */}
        <div className="ws-modal-header">
          <div className="ws-modal-tabs">
            <button
              className={`ws-tab-btn ${mode === 'create' ? 'ws-tab-btn--active' : ''}`}
              onClick={() => { setMode('create'); setError(''); }}
            >
              + Create Workspace
            </button>
            <button
              className={`ws-tab-btn ${mode === 'manage' ? 'ws-tab-btn--active' : ''}`}
              onClick={() => { setMode('manage'); setError(''); }}
            >
              Manage Workspaces ({workspaces.length})
            </button>
          </div>
          <button className="ws-modal-close" onClick={onClose} title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {error && <div className="ws-modal-error">{error}</div>}

        <div className="ws-modal-body">
          {mode === 'create' ? (
            <form onSubmit={handleCreate} className="ws-create-form">
              <div className="form-group">
                <label htmlFor="ws-name-input">Workspace Name</label>
                <input
                  id="ws-name-input"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Financial Reports, Research Project..."
                  autoFocus
                  required
                />
                <span className="form-hint">
                  Workspaces isolate your uploaded documents, embeddings, tasks, and chat history.
                </span>
              </div>

              <div className="ws-modal-actions">
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading || !name.trim()}
                >
                  {loading ? <><span className="spinner spinner--sm" /> Creating…</> : 'Create Workspace'}
                </button>
              </div>
            </form>
          ) : (
            <div className="ws-manage-list">
              {workspaces.map(ws => {
                const isActive = activeWorkspace?.id === ws.id;
                const isEditing = editingId === ws.id;

                return (
                  <div key={ws.id} className={`ws-manage-card ${isActive ? 'ws-manage-card--active' : ''}`}>
                    <div className="ws-card-main">
                      <div className="ws-card-avatar">
                        {ws.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="ws-card-info">
                        {isEditing ? (
                          <div className="ws-edit-inline">
                            <input
                              type="text"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveRename(ws.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                            />
                            <button className="btn-icon btn-icon--save" onClick={() => handleSaveRename(ws.id)} title="Save name">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            </button>
                            <button className="btn-icon" onClick={() => setEditingId(null)} title="Cancel">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="ws-card-name-row">
                              <span className="ws-card-name">{ws.name}</span>
                              {isActive && (
                                <span className="active-pill">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                  Active
                                </span>
                              )}
                            </div>
                            <span className="ws-card-date">Created {new Date(ws.created_at).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="ws-card-actions">
                      {!isActive && (
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => { switchWorkspace(ws); onClose(); }}
                        >
                          Switch
                        </button>
                      )}
                      {!isEditing && (
                        <button
                          className="btn-icon"
                          onClick={() => handleStartRename(ws)}
                          title="Rename workspace"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                      )}
                      {workspaces.length > 1 && (
                        <button
                          className="btn-icon btn-icon--danger"
                          onClick={() => handleDelete(ws.id, ws.name)}
                          title="Delete workspace"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
