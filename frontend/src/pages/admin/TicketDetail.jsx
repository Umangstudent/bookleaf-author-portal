import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tickets as ticketsApi, admin as adminApi } from '../../services/api';

export default function AdminTicketDetail() {
  const { ticketId } = useParams();

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [authorContext, setAuthorContext] = useState(null);
  const [adminsList, setAdminsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status / Priority updates
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [updating, setUpdating] = useState(false);

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  // AI Draft state
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState(null);

  const messagesEndRef = useRef(null);

  const loadTicket = async () => {
    try {
      const data = await ticketsApi.get(ticketId);
      setTicket(data.ticket);
      setMessages(data.messages || []);
      setStatus(data.ticket.status);
      setPriority(data.ticket.priority);
      setCategory(data.ticket.category);
      setAssignedTo(data.ticket.assigned_to || '');

      // Load author profile & book catalog context
      if (data.ticket.author_id) {
        try {
          const authData = await adminApi.getAuthor(data.ticket.author_id);
          setAuthorContext(authData);
        } catch (e) {
          console.warn('Could not load extra author context', e);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
    // Load admin staff list for assignment
    adminApi.admins().then(res => setAdminsList(res.admins || [])).catch(() => {});

    // Polling for real-time ticket thread
    const interval = setInterval(loadTicket, 7000);
    return () => clearInterval(interval);
  }, [ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleUpdateMeta = async (fields) => {
    setUpdating(true);
    try {
      const res = await ticketsApi.update(ticketId, fields);
      if (res.ticket) {
        setTicket(res.ticket);
        setStatus(res.ticket.status);
        setPriority(res.ticket.priority);
        setCategory(res.ticket.category);
        setAssignedTo(res.ticket.assigned_to || '');
      }
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSending(true);
    try {
      await ticketsApi.addMessage(ticketId, {
        content: replyText.trim(),
        is_internal: isInternal
      });
      setReplyText('');
      await loadTicket();
    } catch (err) {
      alert(`Failed to send message: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleGenerateAIDraft = async () => {
    setAiDraftLoading(true);
    try {
      const res = await ticketsApi.getAIDraft(ticketId);
      setAiDraft(res);
      if (res.draft) {
        setReplyText(res.draft);
      }
    } catch (err) {
      alert(`AI draft generation failed: ${err.message}`);
    } finally {
      setAiDraftLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-center" style={{ minHeight: '60vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', marginBottom: 8 }}>
          {error || 'Ticket not found'}
        </div>
        <Link to="/admin/tickets" className="btn btn-secondary">
          Back to Ticket Queue
        </Link>
      </div>
    );
  }

  const getPriorityBadge = (pr) => {
    switch (pr) {
      case 'Critical': return 'badge-danger';
      case 'High': return 'badge-warning';
      case 'Medium': return 'badge-info';
      default: return 'badge-secondary';
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'Open': return 'badge-warning';
      case 'In Progress': return 'badge-info';
      case 'Resolved': return 'badge-success';
      case 'Closed': return 'badge-secondary';
      default: return 'badge-secondary';
    }
  };

  return (
    <div>
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Link to="/admin/tickets" style={{ color: '#818cf8', textDecoration: 'none', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span>←</span> Back to Ticket Queue
        </Link>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className={`badge ${getStatusBadge(ticket.status)}`}>{ticket.status}</span>
          <span className={`badge ${getPriorityBadge(ticket.priority)}`}>{ticket.priority}</span>
        </div>
      </div>

      {/* Main Grid: Left Conversation & AI, Right Context Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 24, alignItems: 'start' }}>
        
        {/* Left Column: Ticket Info & Thread */}
        <div>
          {/* Ticket Header Card */}
          <div className="card" style={{ padding: '24px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#818cf8', fontSize: '0.85rem' }}>
                  {ticket.ticket_id}
                </span>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '6px 0 0 0', color: '#f8fafc' }}>
                  {ticket.subject}
                </h1>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#94a3b8' }}>
                <div>Received: {new Date(ticket.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
                {ticket.assigned_to_name && (
                  <div style={{ marginTop: 4, color: '#a5b4fc' }}>Assigned to: {ticket.assigned_to_name}</div>
                )}
              </div>
            </div>

            {/* AI Classification Reasoning Callout */}
            {ticket.ai_category && (
              <div style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                marginTop: 14,
                fontSize: '0.82rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#a5b4fc', marginBottom: 4 }}>
                  <span>🤖 AI Triage & Routing Analysis:</span>
                  <span className="badge badge-accent badge-sm">{ticket.ai_category}</span>
                  <span className="badge badge-info badge-sm">{ticket.ai_priority}</span>
                </div>
                <div style={{ color: '#cbd5e1', lineHeight: 1.5 }}>
                  {ticket.ai_classification_reasoning || ticket.ai_priority_reasoning || 'Auto-classified using ticket content analysis.'}
                </div>
              </div>
            )}
          </div>

          {/* Conversation history */}
          <div className="card" style={{ padding: '24px', marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.08rem', fontWeight: 600, margin: '0 0 18px 0', color: '#f8fafc' }}>
              Messages & Audit Log ({messages.length + 1})
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Initial message from author */}
              <div style={{
                padding: '16px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 600
                    }}>
                      {ticket.author_name?.slice(0, 1) || 'A'}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.88rem' }}>{ticket.author_name}</span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: 6 }}>Author Inquiry</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {new Date(ticket.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <div style={{ color: '#e2e8f0', fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {ticket.description}
                </div>
              </div>

              {/* Thread messages */}
              {messages.map(msg => {
                const isInternalNote = Boolean(msg.is_internal);
                const isAdmin = msg.sender_role === 'admin';

                return (
                  <div
                    key={msg.id}
                    style={{
                      padding: '16px',
                      borderRadius: 10,
                      background: isInternalNote ? 'rgba(245, 158, 11, 0.08)' : isAdmin ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                      border: isInternalNote ? '1px solid rgba(245, 158, 11, 0.3)' : isAdmin ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: isInternalNote ? 'linear-gradient(135deg, #f59e0b, #d97706)' : isAdmin ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 600
                        }}>
                          {isInternalNote ? '🔒' : isAdmin ? '⚡' : (msg.sender_name?.slice(0, 1) || 'A')}
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.88rem' }}>
                            {msg.sender_name || (isAdmin ? 'BookLeaf Staff' : ticket.author_name)}
                          </span>
                          <span style={{
                            fontSize: '0.72rem',
                            marginLeft: 6,
                            color: isInternalNote ? '#fbbf24' : isAdmin ? '#818cf8' : '#94a3b8'
                          }}>
                            {isInternalNote ? 'Internal Note (Hidden from author)' : isAdmin ? 'Staff Response' : 'Author Reply'}
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {new Date(msg.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    <div style={{ color: '#e2e8f0', fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* AI Copilot & Reply Composer */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#f8fafc' }}>
                  Compose Message
                </h3>
                {/* Internal Note Toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.8rem', color: isInternal ? '#fbbf24' : '#94a3b8' }}>
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                  />
                  <span>🔒 Internal Note Only</span>
                </label>
              </div>

              {/* AI Draft Response Button */}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleGenerateAIDraft}
                disabled={aiDraftLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, borderColor: 'rgba(99, 102, 241, 0.4)', background: 'rgba(99, 102, 241, 0.15)' }}
              >
                <span>✨</span>
                {aiDraftLoading ? 'Generating AI Response...' : 'Generate AI Draft'}
              </button>
            </div>

            {aiDraft && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                marginBottom: 14,
                fontSize: '0.82rem',
                color: '#6ee7b7'
              }}>
                ✓ AI draft synthesized based on author history and related book data. Review or edit below before sending.
              </div>
            )}

            <form onSubmit={handleSendReply}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <textarea
                  className="form-control"
                  rows={6}
                  placeholder={isInternal ? "Write internal staff observation or task note..." : "Write message to author (or click Generate AI Draft above)..."}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  style={{
                    border: isInternal ? '1.5px solid rgba(245, 158, 11, 0.5)' : undefined,
                    background: isInternal ? 'rgba(245, 158, 11, 0.03)' : undefined
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {isInternal ? '⚠️ This note will NOT be visible in the author portal.' : '📢 Author will receive this response in their support portal.'}
                </div>
                <button
                  type="submit"
                  className={isInternal ? "btn btn-secondary" : "btn btn-primary"}
                  disabled={sending || !replyText.trim()}
                >
                  {sending ? 'Sending...' : isInternal ? 'Save Internal Note 🔒' : 'Send to Author 📨'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Workflow Control & Author Context */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Workflow & Status Manager */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 16px 0', color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ⚙️ Ticket Management
            </h3>

            {/* Status */}
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Status</label>
              <select
                className="form-control"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  handleUpdateMeta({ status: e.target.value });
                }}
                disabled={updating}
              >
                <option value="Open">🟡 Open</option>
                <option value="In Progress">🔵 In Progress</option>
                <option value="Resolved">🟢 Resolved</option>
                <option value="Closed">⚪ Closed</option>
              </select>
            </div>

            {/* Priority */}
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Priority</label>
              <select
                className="form-control"
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  handleUpdateMeta({ priority: e.target.value });
                }}
                disabled={updating}
              >
                <option value="Critical">🔴 Critical</option>
                <option value="High">🟠 High</option>
                <option value="Medium">🔵 Medium</option>
                <option value="Low">⚪ Low</option>
              </select>
            </div>

            {/* Category */}
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Category</label>
              <select
                className="form-control"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  handleUpdateMeta({ category: e.target.value });
                }}
                disabled={updating}
              >
                <option value="Royalty & Payments">Royalty & Payments</option>
                <option value="Book Status & Production Updates">Book Status & Production Updates</option>
                <option value="ISBN & Metadata Issues">ISBN & Metadata Issues</option>
                <option value="Printing & Quality">Printing & Quality</option>
                <option value="Distribution & Availability">Distribution & Availability</option>
                <option value="General Inquiry">General Inquiry</option>
              </select>
            </div>

            {/* Assigned Staff */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Assigned Staff</label>
              <select
                className="form-control"
                value={assignedTo}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setAssignedTo(e.target.value);
                  handleUpdateMeta({ assigned_to: val });
                }}
                disabled={updating}
              >
                <option value="">-- Unassigned --</option>
                {adminsList.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Author Details Card */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 14px 0', color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              👤 Author Profile
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#64748b' }}>Name:</span>{' '}
                <strong style={{ color: '#f8fafc' }}>{ticket.author_name}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Author ID:</span>{' '}
                <span style={{ fontFamily: 'monospace', color: '#818cf8' }}>{ticket.author_id}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Email:</span>{' '}
                <span style={{ color: '#cbd5e1' }}>{ticket.author_email}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Location:</span>{' '}
                <span style={{ color: '#cbd5e1' }}>{ticket.author_city || 'India'}</span>
              </div>
            </div>
          </div>

          {/* Related Book Context Card */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 14px 0', color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              📖 Book Context
            </h3>

            {ticket.book_title ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Title:</span>{' '}
                  <strong style={{ color: '#f8fafc' }}>{ticket.book_title}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Genre:</span>{' '}
                  <span style={{ color: '#cbd5e1' }}>{ticket.book_genre || 'Fiction'}</span>
                </div>
                {authorContext?.books && (
                  (() => {
                    const matchedBook = authorContext.books.find(b => b.book_id === ticket.book_id);
                    if (!matchedBook) return null;
                    return (
                      <div style={{
                        marginTop: 8,
                        padding: '10px',
                        borderRadius: 6,
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6
                      }}>
                        <div><span style={{ color: '#64748b' }}>Status:</span> <span className="badge badge-info badge-sm">{matchedBook.status}</span></div>
                        <div><span style={{ color: '#64748b' }}>ISBN:</span> <span style={{ fontFamily: 'monospace' }}>{matchedBook.isbn || 'Pending'}</span></div>
                        <div><span style={{ color: '#64748b' }}>Copies Sold:</span> <strong>{Number(matchedBook.total_copies_sold || 0).toLocaleString()}</strong></div>
                        <div><span style={{ color: '#64748b' }}>Royalty Earned:</span> <strong style={{ color: '#34d399' }}>₹{Number(matchedBook.total_royalty_earned || 0).toLocaleString()}</strong></div>
                      </div>
                    );
                  })()
                )}
              </div>
            ) : (
              <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                General support query (no specific book attached).
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
