import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tickets as ticketsApi } from '../../services/api';

export default function MyTickets() {
  const [ticketsList, setTicketsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    async function fetchTickets() {
      try {
        setLoading(true);
        const res = await ticketsApi.list();
        setTicketsList(res.tickets || res || []);
      } catch (err) {
        setError(err.message || 'Failed to load tickets');
      } finally {
        setLoading(false);
      }
    }
    fetchTickets();
  }, []);

  const filteredTickets = ticketsList.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(search.toLowerCase()) ||
                          (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
                          (t.ticket_id && t.ticket_id.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (st) => {
    switch (st) {
      case 'Open': return 'badge-warning';
      case 'In Progress': return 'badge-info';
      case 'Resolved': return 'badge-success';
      case 'Closed': return 'badge-secondary';
      default: return 'badge-secondary';
    }
  };

  const getPriorityBadge = (pr) => {
    switch (pr) {
      case 'Critical': return 'badge-danger';
      case 'High': return 'badge-warning';
      case 'Medium': return 'badge-info';
      default: return 'badge-secondary';
    }
  };

  if (loading) {
    return (
      <div className="loading-center" style={{ minHeight: '60vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}>
            My Support Tickets
          </h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>
            Track resolution progress and communicate directly with BookLeaf editorial and support staff.
          </p>
        </div>
        <Link to="/author/tickets/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>✏️</span> Create New Ticket
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger mb-4">
          ⚠️ {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <input
            type="text"
            className="form-control"
            placeholder="🔍 Search tickets by subject, keyword, or ticket ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Status:</span>
          {['ALL', 'Open', 'In Progress', 'Resolved', 'Closed'].map(st => (
            <button
              key={st}
              className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.78rem' }}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>

        <div>
          <select
            className="form-control"
            style={{ width: 'auto', fontSize: '0.82rem', padding: '6px 12px' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            <option value="Royalty & Payments">Royalty & Payments</option>
            <option value="Book Status & Production Updates">Book Status & Production Updates</option>
            <option value="ISBN & Metadata Issues">ISBN & Metadata Issues</option>
            <option value="Printing & Quality">Printing & Quality</option>
            <option value="Distribution & Availability">Distribution & Availability</option>
            <option value="General Inquiry">General Inquiry</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '56px 24px', color: '#64748b' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎫</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 600, color: '#94a3b8' }}>No support tickets found</div>
          <p style={{ margin: '8px 0 20px 0', fontSize: '0.88rem' }}>
            {ticketsList.length === 0 ? "You haven't submitted any tickets yet." : "No tickets match your filter criteria."}
          </p>
          <Link to="/author/tickets/new" className="btn btn-primary btn-sm">
            Submit a New Ticket
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredTickets.map(ticket => (
            <Link
              key={ticket.ticket_id}
              to={`/author/tickets/${ticket.ticket_id}`}
              className="card hover-subtle"
              style={{
                display: 'block',
                textDecoration: 'none',
                padding: '20px 24px',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#818cf8', fontWeight: 600 }}>
                    {ticket.ticket_id}
                  </span>
                  <span className={`badge ${getStatusBadge(ticket.status)}`}>
                    {ticket.status}
                  </span>
                  <span className={`badge ${getPriorityBadge(ticket.priority)}`}>
                    {ticket.priority} Priority
                  </span>
                  <span className="badge badge-secondary">
                    🏷️ {ticket.category}
                  </span>
                  {ticket.book_title && (
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      📖 {ticket.book_title}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {new Date(ticket.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>

              <h3 style={{ fontSize: '1.08rem', fontWeight: 600, margin: '0 0 8px 0', color: '#f8fafc' }}>
                {ticket.subject}
              </h3>

              <p style={{
                color: '#94a3b8',
                fontSize: '0.88rem',
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {ticket.description}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: '0.78rem', color: '#64748b' }}>
                <span>💬 {ticket.message_count || 1} message{(ticket.message_count || 1) > 1 ? 's' : ''} in thread</span>
                <span style={{ color: '#818cf8', fontWeight: 500 }}>Open Conversation ➜</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
