import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tickets as ticketsApi } from '../../services/api';

export default function TicketQueue() {
  const [ticketsList, setTicketsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    async function fetchTickets() {
      try {
        setLoading(true);
        const res = await ticketsApi.list();
        setTicketsList(res.tickets || res || []);
      } catch (err) {
        setError(err.message || 'Failed to load tickets queue');
      } finally {
        setLoading(false);
      }
    }
    fetchTickets();
  }, []);

  const filteredTickets = ticketsList.filter(t => {
    const authorName = t.author_name || '';
    const matchesSearch = t.subject.toLowerCase().includes(search.toLowerCase()) ||
                          t.ticket_id.toLowerCase().includes(search.toLowerCase()) ||
                          authorName.toLowerCase().includes(search.toLowerCase()) ||
                          (t.description && t.description.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
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
            Author Support Queue
          </h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>
            Filter, triage, review AI drafts, and respond to incoming author queries.
          </p>
        </div>
        <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          Showing <strong>{filteredTickets.length}</strong> of {ticketsList.length} tickets
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-4">
          ⚠️ {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 24, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <input
            type="text"
            className="form-control"
            placeholder="🔍 Search by author name, ticket ID, subject or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status buttons */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Status:</span>
          {['ALL', 'Open', 'In Progress', 'Resolved', 'Closed'].map(st => (
            <button
              key={st}
              className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Priority select */}
        <div>
          <select
            className="form-control"
            style={{ width: 'auto', fontSize: '0.8rem', padding: '6px 10px' }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="ALL">All Priorities</option>
            <option value="Critical">🔴 Critical</option>
            <option value="High">🟠 High</option>
            <option value="Medium">🔵 Medium</option>
            <option value="Low">⚪ Low</option>
          </select>
        </div>

        {/* Category select */}
        <div>
          <select
            className="form-control"
            style={{ width: 'auto', fontSize: '0.8rem', padding: '6px 10px' }}
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

      {/* Tickets Table */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Author</th>
                <th>Subject & Preview</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned Staff</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', color: '#64748b', padding: '48px 24px' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                    No tickets match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTickets.map(ticket => (
                  <tr key={ticket.ticket_id} className="hover-subtle">
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#818cf8', whiteSpace: 'nowrap' }}>
                      {ticket.ticket_id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap' }}>
                        {ticket.author_name || ticket.author_id}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{ticket.author_city || ''}</div>
                    </td>
                    <td style={{ maxWidth: 300 }}>
                      <div style={{ fontWeight: 500, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ticket.subject}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ticket.description}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-secondary badge-sm" style={{ whiteSpace: 'nowrap' }}>
                        {ticket.category}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getPriorityBadge(ticket.priority)} badge-sm`} style={{ whiteSpace: 'nowrap' }}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(ticket.status)} badge-sm`} style={{ whiteSpace: 'nowrap' }}>
                        {ticket.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {ticket.assigned_to_name || <span style={{ color: '#64748b', fontStyle: 'italic' }}>Unassigned</span>}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <Link
                        to={`/admin/tickets/${ticket.ticket_id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Respond ➜
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
