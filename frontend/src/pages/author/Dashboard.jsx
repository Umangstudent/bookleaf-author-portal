import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { books as booksApi, tickets as ticketsApi } from '../../services/api';

export default function AuthorDashboard() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [booksData, ticketsData] = await Promise.all([
          booksApi.myBooks(),
          ticketsApi.list()
        ]);
        setBooks(booksData.books || booksData || []);
        setTickets(ticketsData.tickets || ticketsData || []);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="loading-center" style={{ minHeight: '60vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  // Calculate metrics
  const totalBooks = books.length;
  const publishedBooks = books.filter(b => b.status === 'Published').length;
  const inProgressBooks = books.filter(b => b.status !== 'Published').length;
  const totalRoyalties = books.reduce((sum, b) => sum + (Number(b.total_royalty_earned) || 0), 0);
  const totalSold = books.reduce((sum, b) => sum + (Number(b.total_copies_sold) || 0), 0);

  const openTickets = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;
  const resolvedTickets = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;

  const recentTickets = tickets.slice(0, 4);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}>
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>
            Here is what's happening across your published catalog and support requests.
          </p>
        </div>
        <Link to="/author/tickets/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>✏️</span> Submit Support Ticket
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger mb-4">
          ⚠️ {error}
        </div>
      )}

      {/* Metric Cards */}
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-label">Total Royalties Earned</div>
          <div className="stat-value" style={{ color: '#34d399' }}>
            ₹{totalRoyalties.toLocaleString('en-IN')}
          </div>
          <div className="stat-meta">Across {totalSold.toLocaleString('en-IN')} total copies sold</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Your Catalog</div>
          <div className="stat-value">{totalBooks}</div>
          <div className="stat-meta">{publishedBooks} Published • {inProgressBooks} In Pipeline</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Active Support Tickets</div>
          <div className="stat-value" style={{ color: openTickets > 0 ? '#fbbf24' : '#94a3b8' }}>
            {openTickets}
          </div>
          <div className="stat-meta">{resolvedTickets} resolved historical tickets</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Author ID</div>
          <div className="stat-value" style={{ fontSize: '1.3rem', fontFamily: 'monospace' }}>
            {user?.author_id || user?.id || '—'}
          </div>
          <div className="stat-meta">City: {user?.city || 'India'}</div>
        </div>
      </div>

      {/* Main Grid: Books Preview & Recent Tickets */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
        {/* Books Preview */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, color: '#f8fafc' }}>
                Your Books ({books.length})
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Catalog status & sales snapshot</span>
            </div>
            <Link to="/author/books" className="btn btn-ghost btn-sm">
              View All ➜
            </Link>
          </div>

          {books.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: '#64748b' }}>
              No books registered in your catalog yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {books.slice(0, 3).map((book) => (
                <div
                  key={book.book_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 38,
                      height: 50,
                      borderRadius: 4,
                      background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                    }}>
                      📖
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.95rem' }}>{book.title}</div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
                        ISBN: <span style={{ fontFamily: 'monospace' }}>{book.isbn || 'Pending'}</span> • {book.genre}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${
                      book.status === 'Published' ? 'badge-success' :
                      book.status === 'Printing' ? 'badge-info' : 'badge-warning'
                    }`}>
                      {book.status}
                    </span>
                    <div style={{ fontSize: '0.78rem', color: '#34d399', marginTop: 4, fontWeight: 500 }}>
                      ₹{Number(book.total_royalty_earned || 0).toLocaleString('en-IN')} earned
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Support Tickets */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, color: '#f8fafc' }}>
                Recent Tickets
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Latest status on your inquiries</span>
            </div>
            <Link to="/author/tickets" className="btn btn-ghost btn-sm">
              All Tickets ➜
            </Link>
          </div>

          {recentTickets.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🎉</div>
              No open tickets. Need help with royalties or book status?
              <div style={{ marginTop: 12 }}>
                <Link to="/author/tickets/new" className="btn btn-primary btn-sm">
                  Create Ticket
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentTickets.map(ticket => (
                <Link
                  key={ticket.ticket_id}
                  to={`/author/tickets/${ticket.ticket_id}`}
                  style={{
                    display: 'block',
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-subtle"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#e2e8f0', marginBottom: 4 }}>
                      {ticket.subject}
                    </div>
                    <span className={`badge badge-sm ${
                      ticket.status === 'Open' ? 'badge-warning' :
                      ticket.status === 'In Progress' ? 'badge-info' : 'badge-success'
                    }`}>
                      {ticket.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <span>🏷️ {ticket.category}</span>
                    <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
