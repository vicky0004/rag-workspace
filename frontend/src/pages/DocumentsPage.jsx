import { useState, useEffect, useCallback, useRef } from 'react';
import { getDocuments, uploadDocument, deleteDocument } from '../lib/api';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { showConfirmDialog, showToast } from '../lib/alerts';
import './DocumentsPage.css';

function StatusBadge({ status }) {
  const map = {
    ready: { label: 'Ready', cls: 'badge--success' },
    processing: { label: 'Processing…', cls: 'badge--warning' },
    failed: { label: 'Failed', cls: 'badge--error' },
  };
  const { label, cls } = map[status] || { label: status, cls: '' };
  return <span className={`status-badge ${cls}`}>{label}</span>;
}

export default function DocumentsPage() {
  const { activeWorkspace } = useWorkspace();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const loadDocs = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const res = await getDocuments(activeWorkspace.id);
      setDocuments(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  // Poll for processing documents
  useEffect(() => {
    const hasProcessing = documents.some(d => d.status === 'processing');
    if (!hasProcessing) return;
    const interval = setInterval(loadDocs, 3000);
    return () => clearInterval(interval);
  }, [documents, loadDocs]);

  const handleUpload = async (files) => {
    if (!files?.length || !activeWorkspace) return;
    setError('');
    setUploading(true);

    for (const file of files) {
      try {
        const res = await uploadDocument(activeWorkspace.id, file);
        if (res.data) {
          setDocuments(prev => {
            const exists = prev.find(d => d.id === res.data.id);
            return exists ? prev : [res.data, ...prev];
          });
          showToast({ title: `Uploaded "${file.name}" — processing embeddings` });
        }
      } catch (e) {
        setError(e.response?.data?.message || `Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    setTimeout(loadDocs, 1000);
  };

  const handleDelete = async (doc) => {
    const confirmed = await showConfirmDialog({
      title: `Delete "${doc.filename}"?`,
      text: 'This document and all its indexed vector chunks will be permanently deleted.',
      confirmText: 'Yes, delete document',
      cancelText: 'Cancel',
      danger: true,
    });

    if (!confirmed) return;

    try {
      await deleteDocument(activeWorkspace.id, doc.id);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      showToast({ title: `Document "${doc.filename}" deleted`, icon: 'info' });
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to delete document');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload([...e.dataTransfer.files]);
  };

  if (!activeWorkspace) {
    return (
      <div className="docs-empty-state">
        <div className="empty-icon">📁</div>
        <p>Select or create a workspace to manage documents</p>
      </div>
    );
  }

  return (
    <div className="documents-page">
      <div className="docs-header">
        <div>
          <h2>Documents</h2>
          <p className="docs-subtitle">{documents.length} document{documents.length !== 1 ? 's' : ''} in {activeWorkspace.name}</p>
        </div>
        <button
          className="btn-primary docs-header-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          id="btn-upload-document"
        >
          {uploading ? <><span className="spinner spinner--sm" /> Uploading…</> : '+ Upload Document'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
          multiple
          style={{ display: 'none' }}
          onChange={e => handleUpload([...e.target.files])}
        />
      </div>

      {error && <div className="docs-error">{error} <button onClick={() => setError('')}>✕</button></div>}

      {/* Drop zone */}
      <div
        className={`drop-zone ${dragOver ? 'drop-zone--active' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p>Drop <strong>.txt</strong>, <strong>.md</strong>, or <strong>.pdf</strong> files here — or click <strong>Upload Document</strong> above</p>
      </div>

      {loading ? (
        <div className="docs-loading"><span className="spinner" /> Loading documents…</div>
      ) : documents.length === 0 ? (
        <div className="docs-empty">
          <p>No documents yet. Upload a file to get started.</p>
        </div>
      ) : (
        <div className="docs-table-wrapper">
          <table className="docs-table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Status</th>
                <th>Uploaded</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id}>
                  <td>
                    <div className="doc-name">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span>{doc.filename}</span>
                    </div>
                  </td>
                  <td><StatusBadge status={doc.status} /></td>
                  <td className="doc-date">{new Date(doc.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn-icon btn-icon--danger"
                      onClick={() => handleDelete(doc)}
                      title="Delete document"
                      id={`btn-delete-doc-${doc.id}`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sticky/bottom Upload Document bar for mobile */}
      <div className="docs-mobile-bottom-bar">
        <button
          className="btn-primary docs-mobile-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          id="btn-upload-document-mobile"
        >
          {uploading ? (
            <>
              <span className="spinner spinner--sm" /> Uploading…
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span>+ Upload Document</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
