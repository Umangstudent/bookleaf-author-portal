import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { tickets as ticketsApi } from '../../services/api';

export default function AuthorTicketDetail() {
  const { ticketId } = useParams();
  const { user } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState(null);

  const messagesEndRef = useRef(null);

  const loadTicket = async () => {
    try {
      const data = await ticketsApi.get(ticketId);
      setTicket(data.ticket);
      setMessages(data.messages || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
    // Poll every 8 seconds for live updates
    const interval = setInterval(loadTicket, 8000);
    return () => clearInterval(interval);
  }, [ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSending(true);
    setReplyError(null);

    try {
      await ticketsApi.addMessage(ticketId, { content: replyText.trim() });
      setReplyText('');
      await loadTicket();
    } catch (err) {
      setReplyError(err.message || 'Failed to send reply');
    } finally {
      setSending(false);
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
        <Link to="/author/tickets" className="btn btn-secondary">
          Back to Tickets
        </Link>
      </div>
    );
  }

  const getStatusBadge = (st) => {
    switch (st) {
      case 'Open': return 'badge-warning';
      case 'In Progress': return 'badge-info';
      case 'Resolved': return 'badge-success';
      case 'Closed': return 'badge-secondary';
      default: return 'badge-secondary';
    }
  };

  const isClosed = ticket.status === 'Closed';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Top back navigation */}
      <div style={{ marginBottom: 16 }}>
        <Link to="/author/tickets" style={{ color: '#818cf8', textDecoration: 'none', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span>←</span> Back to All Tickets
        </Link>
      </div>

      {/* Ticket Header Card */}
      <div className="card" style={{ padding: '24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#818cf8', fontSize: '0.9rem' }}>
                {ticket.ticket_id}
              </span>
              <span className={`badge ${getStatusBadge(ticket.status)}`}>
                {ticket.status}
              </span>
              <span className="badge badge-secondary">
                🏷️ {ticket.category}
              </span>
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              {ticket.subject}
            </h1>
          </div>

          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#94a3b8' }}>
            <div>Opened: {new Date(ticket.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
            {ticket.updated_at && (
              <div style={{ marginTop: 4, color: '#64748b' }}>
                Updated: {new Date(ticket.updated_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            )}
          </div>
        </div>

        {/* Context metadata pill */}
        {ticket.book_title && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 6,
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            fontSize: '0.82rem',
            color: '#cbd5e1'
          }}>
            <span>📖 Related Book:</span>
            <strong>{ticket.book_title}</strong>
            {ticket.book_genre && <span style={{ color: '#94a3b8' }}>({ticket.book_genre})</span>}
          </div>
        )}
      </div>

      {/* Conversation Thread */}
      <div className="card" style={{ padding: '24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 20px 0', color: '#f8fafc' }}>
          Conversation History
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Initial ticket message */}
          <div style={{
            padding: '16px 20px',
            borderRadius: 12,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '0.8rem'
                }}>
                  {ticket.author_name?.slice(0, 1) || 'A'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>{ticket.author_name} (Author)</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Original Request</div>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {new Date(ticket.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
            <div style={{ color: '#e2e8f0', fontSize: '0.92rem', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {ticket.description}
            </div>
          </div>

          {/* Subsequent messages */}
          {messages.map((msg) => {
            const isAdmin = msg.sender_role === 'admin';

            return (
              <div
                key={msg.id}
                style={{
                  padding: '16px 20px',
                  borderRadius: 12,
                  background: isAdmin ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: isAdmin ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                  marginLeft: isAdmin ? 0 : 20,
                  marginRight: isAdmin ? 20 : 0
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: isAdmin ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: '0.8rem'
                    }}>
                      {isAdmin ? '⚡' : (msg.sender_name?.slice(0, 1) || 'A')}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>
                        {msg.sender_name || (isAdmin ? 'BookLeaf Support Team' : ticket.author_name)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: isAdmin ? '#818cf8' : '#94a3b8' }}>
                        {isAdmin ? 'Official Staff Response' : 'Author Reply'}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {new Date(msg.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <div style={{ color: '#e2e8f0', fontSize: '0.92rem', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {msg.content}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Reply Section */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 14px 0', color: '#f8fafc' }}>
          Send a Reply
        </h3>

        {isClosed ? (
          <div style={{
            padding: '16px',
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#94a3b8',
            fontSize: '0.9rem',
            textAlign: 'center'
          }}>
            🔒 This ticket has been marked as <strong>Closed</strong>. If you need further assistance on this topic, please create a new support ticket.
          </div>
        ) : (
          <form onSubmit={handleSendReply}>
            {replyError && (
              <div className="alert alert-danger mb-3">
                ⚠️ {replyError}
              </div>
            )}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <textarea
                className="form-control"
                rows={4}
                placeholder="Type your response here..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={sending || !replyText.trim()}
              >
                {sending ? 'Sending...' : 'Send Message 💬'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
