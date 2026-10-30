import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { admin as adminApi } from '../../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const data = await adminApi.stats();
        setStats(data);
      } catch (err) {
        setError(err.message || 'Failed to load admin stats');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="loading-center" style={{ minHeight: '60vh' }}>
        <div className="spinner spinner-lg" />
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

  const getPriorityBadge = (pr) => {
    switch (pr) {
      case 'Critical': return 'badge-danger';
      case 'High': return 'badge-warning';
      case 'Medium': return 'badge-info';
      default: return 'badge-secondary';
    }
  };

  const t = stats?.tickets || {};
  const authors = stats?.authors || {};
  const books = stats?.books || {};
  const recent = stats?.recent || [];

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}>
            BookLeaf Operations Dashboard
          </h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>
            Author support performance, queue health, and publishing catalog metrics.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/admin/tickets" className="btn btn-primary">
            🎫 Open Ticket Queue ({t.open || 0})
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-4">
          ⚠️ {error}
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Open Support Queue</div>
          <div className="stat-value" style={{ color: (t.open || 0) > 0 ? '#fbbf24' : '#34d399' }}>
            {t.open || 0}
          </div>
          <div className="stat-meta">{t.inProgress || 0} currently in progress</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Critical / High Attention</div>
          <div className="stat-value" style={{ color: ((t.criticalOpen || 0) + (t.highOpen || 0)) > 0 ? '#f87171' : '#34d399' }}>
            {(t.criticalOpen || 0) + (t.highOpen || 0)}
          </div>
          <div className="stat-meta">{t.criticalOpen || 0} Critical • {t.highOpen || 0} High Priority</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Author Community</div>
          <div className="stat-value">{authors.total || 0}</div>
          <div className="stat-meta">Active registered authors</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Publishing Catalog</div>
          <div className="stat-value" style={{ color: '#38bdf8' }}>{books.total || 0}</div>
          <div className="stat-meta">{books.published || 0} Published & Live</div>
        </div>
      </div>

      {/* Charts / Breakdown Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
        {/* Category Breakdown */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 16px 0', color: '#f8fafc' }}>
            Inquiries by Category
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(t.byCategory || []).map((cat, idx) => {
              const count = Number(cat.count || 0);
              const total = Number(t.total || 1);
              const pct = Math.round((count / total) * 100);

              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{cat.category || 'Uncategorized'}</span>
                    <span style={{ color: '#94a3b8' }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                      borderRadius: 3
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 16px 0', color: '#f8fafc' }}>
            Ticket Pipeline Distribution
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(t.byStatus || []).map((st, idx) => {
              const count = Number(st.count || 0);
              const total = Number(t.total || 1);
              const pct = Math.round((count / total) * 100);

              const color = st.status === 'Open' ? '#fbbf24' :
                            st.status === 'In Progress' ? '#38bdf8' :
                            st.status === 'Resolved' ? '#34d399' : '#94a3b8';

              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{st.status}</span>
                    <span style={{ color: '#94a3b8' }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: color,
                      borderRadius: 3
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: '#f8fafc' }}>
              Recently Received Tickets
            </h2>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Real-time author inquiries requiring response</span>
          </div>
          <Link to="/admin/tickets" className="btn btn-ghost btn-sm">
            View All ({t.total || 0}) ➜
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Author</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>
                    No recent tickets found.
                  </td>
                </tr>
              ) : (
                recent.map(ticket => (
                  <tr key={ticket.ticket_id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#818cf8' }}>
                      {ticket.ticket_id}
                    </td>
                    <td style={{ fontWeight: 500, color: '#f8fafc' }}>
                      {ticket.author_name}
                    </td>
                    <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ticket.subject}
                    </td>
                    <td>
                      <span className="badge badge-secondary badge-sm">{ticket.category}</span>
                    </td>
                    <td>
                      <span className={`badge ${getPriorityBadge(ticket.priority)} badge-sm`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(ticket.status)} badge-sm`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <Link to={`/admin/tickets/${ticket.ticket_id}`} className="btn btn-ghost btn-sm" style={{ color: '#818cf8', padding: '4px 8px' }}>
                        Manage ➜
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
