import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getChatHistory, sendMessage as sendMsg } from '../lib/api';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useChat } from '../contexts/ChatContext';
import './ChatPage.css';

function CitationBadge({ citation }) {
  return (
    <span className="citation-badge" title={`${citation.filename} – chunk ${citation.chunk_index}`}>
      📄 {citation.filename} <span className="citation-chunk">#{citation.chunk_index}</span>
    </span>
  );
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  const citations = msg.citations || [];

  return (
    <div className={`message ${isUser ? 'message--user' : 'message--assistant'}`}>
      <div className="message-bubble">
        {isUser ? (
          <p className="message-text">{msg.content}</p>
        ) : (
          <div className="message-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {msg.content}
            </ReactMarkdown>
          </div>
        )}

        {citations.length > 0 && (
          <div className="message-citations">
            <span className="citations-label">Sources:</span>
            {citations.map((c, i) => <CitationBadge key={i} citation={c} />)}
          </div>
        )}
      </div>
      <span className="message-time">
        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

export default function ChatPage({ onNavigate }) {
  const { activeWorkspace } = useWorkspace();
  const {
    activeSessionId,
    activeSession,
    startNewChat,
    selectSession,
    updateSessionFromMessage,
    refreshSessions,
  } = useChat();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const loadHistory = useCallback(async () => {
    if (!activeWorkspace) return;
    if (!activeSessionId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await getChatHistory(activeWorkspace.id, activeSessionId);
      setMessages(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, activeSessionId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = async () => {
    if (!input.trim() || sending || !activeWorkspace) return;
    const userText = input.trim();
    setInput('');
    setError('');
    setSending(true);

    // Optimistically add user message
    const optimisticUser = {
      id: 'temp-user',
      role: 'user',
      content: userText,
      created_at: new Date().toISOString(),
      citations: [],
    };
    setMessages(prev => [...prev, optimisticUser]);

    try {
      const res = await sendMsg(activeWorkspace.id, userText, activeSessionId);
      const { userMessage, assistantMessage, sessionId } = res.data;

      if (sessionId) {
        selectSession(sessionId);
        updateSessionFromMessage(sessionId, userText.slice(0, 32));
        refreshSessions();
      }

      setMessages(prev => [
        ...prev.filter(m => m.id !== 'temp-user'),
        userMessage,
        assistantMessage,
      ]);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to process message. Please try again.');
      setMessages(prev => prev.filter(m => m.id !== 'temp-user'));
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!activeWorkspace) {
    return (
      <div className="chat-empty-state">
        <div className="empty-icon">💬</div>
        <p>Select or create a workspace to start chatting</p>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-header">
        <div className="chat-header-actions-left mobile-only-action">
          <button
            className="btn-secondary btn-sm btn-header-add-file"
            onClick={() => onNavigate?.('documents')}
            title="Navigate to Documents to add or upload files"
            id="btn-header-add-file"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add File</span>
          </button>
        </div>

        <div className="chat-header-left">
          <h2>{activeSession?.title || 'Chat'}</h2>
          <span className="chat-hint">{activeWorkspace.name} • Grounded in documents</span>
        </div>

        <div className="chat-header-actions-right">
          <button
            className="btn-secondary btn-sm"
            onClick={startNewChat}
            title="Start a new conversation"
            id="btn-header-new-chat"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Chat</span>
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {loading && <div className="chat-loading"><span className="spinner" /> Loading conversation…</div>}
        {!loading && messages.length === 0 && (
          <div className="chat-empty-state">
            <div className="empty-icon">🔍</div>
            <p>Start asking questions grounded in your workspace documents!</p>
            <span className="chat-empty-hint">Press Enter to send • Shift+Enter for new line</span>
          </div>
        )}
        {messages.map(msg => <Message key={msg.id} msg={msg} />)}
        {sending && (
          <div className="message message--assistant">
            <div className="message-bubble typing-indicator">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <div className="chat-error">{error}</div>}

      <div className="chat-input-area">
        <button
          type="button"
          className="btn-secondary btn-add-file-desktop"
          onClick={() => onNavigate?.('documents')}
          title="Go to Documents to add or upload files"
          id="btn-desktop-add-file"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Add File</span>
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask From RAG"
          rows={1}
          className="chat-textarea"
          disabled={sending}
        />
        <button
          className="btn-send"
          onClick={handleSend}
          disabled={!input.trim() || sending}
          aria-label="Send message"
          id="btn-send-message"
        >
          {sending ? <span className="spinner spinner--sm" /> : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
