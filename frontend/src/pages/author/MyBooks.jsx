import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { books as booksApi } from '../../services/api';

export default function MyBooks() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    async function fetchBooks() {
      try {
        setLoading(true);
        const data = await booksApi.myBooks();
        setBooks(data.books || data || []);
      } catch (err) {
        setError(err.message || 'Failed to load books catalog');
      } finally {
        setLoading(false);
      }
    }
    fetchBooks();
  }, []);

  const filteredBooks = books.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(search.toLowerCase()) ||
                          (b.isbn && b.isbn.toLowerCase().includes(search.toLowerCase())) ||
                          b.genre.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Published': return 'badge-success';
      case 'Printing': return 'badge-info';
      case 'In Formatting': return 'badge-purple';
      case 'Under Review': return 'badge-warning';
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
            My Published Titles & Catalog
          </h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>
            Track publication progress, ISBN assignment, and royalty earnings for all your titles.
          </p>
        </div>
        <Link to="/author/tickets/new" className="btn btn-secondary">
          ❓ Need Support with a Book?
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger mb-4">
          ⚠️ {error}
        </div>
      )}

      {/* Filters bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <input
            type="text"
            className="form-control"
            placeholder="🔍 Search by title, ISBN, or genre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Status:</span>
          {['ALL', 'Published', 'Printing', 'In Formatting', 'Under Review'].map((st) => (
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
      </div>

      {/* Book cards grid */}
      {filteredBooks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📚</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#94a3b8' }}>No titles found</div>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem' }}>Try clearing filters or search query.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
          {filteredBooks.map((book) => {
            const earned = Number(book.total_royalty_earned || 0);
            const sold = Number(book.total_copies_sold || 0);
            const royaltyPerCopy = Number(book.author_royalty_per_copy || 0);

            return (
              <div key={book.book_id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  {/* Top row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <span className={`badge ${getStatusBadge(book.status)}`}>
                      {book.status}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                      ID: {book.book_id}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: '0 0 8px 0', color: '#f8fafc' }}>
                    {book.title}
                  </h3>
                  
                  <div style={{ display: 'flex', gap: 12, fontSize: '0.82rem', color: '#94a3b8', marginBottom: 16 }}>
                    <span>🏷️ {book.genre}</span>
                    <span>•</span>
                    <span>📅 {book.publication_date ? new Date(book.publication_date).toLocaleDateString() : 'Pending'}</span>
                  </div>

                  {/* ISBN Box */}
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: '0.8rem',
                    marginBottom: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: '#94a3b8' }}>ISBN-13:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: book.isbn ? '#e2e8f0' : '#eab308' }}>
                      {book.isbn || 'Pending Assignment'}
                    </span>
                  </div>

                  {/* Commercial Stats */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 8,
                    background: 'rgba(15, 23, 42, 0.6)',
                    padding: '12px',
                    borderRadius: 8,
                    marginBottom: 16,
                    textAlign: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>MRP</div>
                      <div style={{ fontWeight: 600, color: '#e2e8f0', marginTop: 2 }}>₹{book.mrp || 0}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Sold</div>
                      <div style={{ fontWeight: 600, color: '#38bdf8', marginTop: 2 }}>{sold.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Royalty/Copy</div>
                      <div style={{ fontWeight: 600, color: '#e2e8f0', marginTop: 2 }}>₹{royaltyPerCopy}</div>
                    </div>
                  </div>

                  {/* Total Earnings highlight */}
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16
                  }}>
                    <span style={{ fontSize: '0.82rem', color: '#a7f3d0' }}>Total Royalty Earned:</span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#34d399' }}>
                      ₹{earned.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Footer action */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                  <Link
                    to={`/author/tickets/new?book_id=${book.book_id}&title=${encodeURIComponent(book.title)}`}
                    className="btn btn-ghost btn-sm btn-full"
                    style={{ fontSize: '0.8rem', color: '#818cf8' }}
                  >
                    💬 Raise Query for this Book
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
