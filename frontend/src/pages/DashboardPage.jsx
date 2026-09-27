import { useState, useEffect, useCallback } from 'react';
import { getDashboard, updateTask, deleteTask } from '../lib/api';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { showConfirmDialog, showToast } from '../lib/alerts';
import './DashboardPage.css';

function ToolCallRow({ tc }) {
  const [expanded, setExpanded] = useState(false);
  const isSuccess = tc.status === 'success';

  return (
    <div className="tool-call-row">
      <div className="tool-call-header" onClick={() => setExpanded(!expanded)}>
        <span className={`status-dot ${isSuccess ? 'status-dot--success' : 'status-dot--error'}`} />
        <span className="tool-name">{tc.tool_name}</span>
        <span className="tool-date">{new Date(tc.created_at).toLocaleString()}</span>
        <svg
          className={`chevron ${expanded ? 'chevron--open' : ''}`}
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {expanded && (
        <div className="tool-call-detail">
          <div className="detail-section">
            <span className="detail-label">Args</span>
            <pre>{JSON.stringify(tc.args, null, 2)}</pre>
          </div>
          <div className="detail-section">
            <span className="detail-label">Result</span>
            <pre>{JSON.stringify(tc.result, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { activeWorkspace } = useWorkspace();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const res = await getDashboard(activeWorkspace.id);
      setData(res.data);
    } catch (e) {
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggleTask = async (task) => {
    if (!activeWorkspace) return;
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    // Optimistic update
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t),
    }));

    try {
      await updateTask(activeWorkspace.id, task.id, { status: newStatus });
      showToast({
        title: newStatus === 'completed' ? 'Task marked completed' : 'Task marked pending',
        icon: newStatus === 'completed' ? 'success' : 'info',
      });
    } catch (e) {
      console.error('Failed to update task:', e);
      loadData();
    }
  };

  const handleDeleteTask = async (task) => {
    if (!activeWorkspace) return;

    const confirmed = await showConfirmDialog({
      title: 'Delete Task?',
      text: `Are you sure you want to delete "${task.title}"?`,
      confirmText: 'Yes, delete task',
      cancelText: 'Cancel',
      danger: true,
    });

    if (!confirmed) return;

    // Optimistic update
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== task.id),
    }));

    try {
      await deleteTask(activeWorkspace.id, task.id);
      showToast({ title: 'Task deleted', icon: 'info' });
    } catch (e) {
      console.error('Failed to delete task:', e);
      loadData();
    }
  };

  if (!activeWorkspace) {
    return (
      <div className="dash-empty-state">
        <div className="empty-icon">📊</div>
        <p>Select a workspace to view its statistics</p>
      </div>
    );
  }

  if (loading) return <div className="dash-loading"><span className="spinner" /> Loading statistics…</div>;
  if (error) return <div className="dash-error">{error}</div>;
  if (!data) return null;

  const readyDocs = data.documents?.filter(d => d.status === 'ready').length || 0;
  const successCalls = data.toolCalls?.filter(t => t.status === 'success').length || 0;
  const pendingTasks = data.tasks?.filter(t => t.status !== 'completed').length || 0;
  const completedTasks = data.tasks?.filter(t => t.status === 'completed').length || 0;

  return (
    <div className="dashboard-page">
      <div className="dash-header">
        <h2>{activeWorkspace.name}</h2>
        <p className="dash-subtitle">Workspace statistics & activity overview</p>
      </div>

      {/* Stat cards */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-icon stat-icon--docs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div>
            <div className="stat-value">{data.documents?.length || 0}</div>
            <div className="stat-label">Documents ({readyDocs} ready)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--tools">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <div>
            <div className="stat-value">{data.toolCalls?.length || 0}</div>
            <div className="stat-label">Tool calls ({successCalls} successful)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--tasks">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <div>
            <div className="stat-value">{data.tasks?.length || 0}</div>
            <div className="stat-label">Tasks ({pendingTasks} open, {completedTasks} done)</div>
          </div>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="dash-section">
        <div className="section-header-row">
          <h3>Tasks & To-Dos</h3>
          <span className="badge-count">{data.tasks?.length || 0}</span>
        </div>
        {data.tasks?.length === 0 ? (
          <p className="dash-empty">No tasks yet. Ask the AI in chat to create or track tasks!</p>
        ) : (
          <div className="task-list">
            {data.tasks.map(task => {
              const isDone = task.status === 'completed';
              return (
                <div key={task.id} className={`task-item ${isDone ? 'task-item--done' : ''}`}>
                  <button
                    className={`task-checkbox ${isDone ? 'task-checkbox--checked' : ''}`}
                    onClick={() => handleToggleTask(task)}
                    title={isDone ? 'Mark as pending' : 'Mark as completed'}
                  >
                    {isDone ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      <span className="checkbox-empty" />
                    )}
                  </button>
                  <span className="task-title">{task.title}</span>
                  <span className={`task-status-badge ${isDone ? 'task-status-badge--done' : 'task-status-badge--pending'}`}>
                    {isDone ? 'Completed' : 'Pending'}
                  </span>
                  <span className="task-date">{new Date(task.created_at).toLocaleDateString()}</span>
                  <button
                    className="btn-icon btn-icon--danger task-delete-btn"
                    onClick={() => handleDeleteTask(task)}
                    title="Delete task"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tool call audit log */}
      <div className="dash-section">
        <div className="section-header-row">
          <h3>Tool Call Audit Log</h3>
          <span className="badge-count">{data.toolCalls?.length || 0}</span>
        </div>
        {data.toolCalls?.length === 0 ? (
          <p className="dash-empty">No tool calls recorded yet.</p>
        ) : (
          <div className="tool-calls-list">
            {data.toolCalls?.map(tc => <ToolCallRow key={tc.id} tc={tc} />)}
          </div>
        )}
      </div>
    </div>
  );
}
