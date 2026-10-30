import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { books as booksApi, tickets as ticketsApi } from '../../services/api';

const CATEGORIES = [
  { id: 'Royalty & Payments', label: '💰 Royalties & Payments', desc: 'Statements, calculation, disbursement status' },
  { id: 'Book Status & Production Updates', label: '📖 Book Status & Timeline', desc: 'Editing, formatting, proofreading, publishing date' },
  { id: 'ISBN & Metadata Issues', label: '🔢 ISBN & Metadata', desc: 'ISBN assignment, barcode, copyright page details' },
  { id: 'Printing & Quality', label: '🖨️ Printing & Physical Copies', desc: 'Paper quality, binding, author copies delivery, defects' },
  { id: 'Distribution & Availability', label: '🌐 Distribution & Marketplaces', desc: 'Amazon, Flipkart listing, availability issues' },
  { id: 'General Inquiry', label: '❓ General Inquiry', desc: 'Marketing, account details, other questions' }
];

export default function SubmitTicket() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [books, setBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState(searchParams.get('book_id') || '');
  const [category, setCategory] = useState('Royalty & Payments');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadBooks() {
      try {
        const res = await booksApi.myBooks();
        setBooks(res.books || res || []);
      } catch (err) {
        console.error('Failed to load books for ticket creation', err);
      }
    }
    loadBooks();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError('Please provide a subject and detailed description.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        subject: subject.trim(),
        description: description.trim(),
        category,
        book_id: selectedBookId || null
      };

      const res = await ticketsApi.create(payload);
      const ticketId = res.ticket_id || res.ticket?.ticket_id;
      if (ticketId) {
        navigate(`/author/tickets/${ticketId}`);
      } else {
        navigate('/author/tickets');
      }
    } catch (err) {
      setError(err.message || 'Failed to submit ticket. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}>
          Submit a Support Request
        </h1>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>
          Our editorial, production, and royalties teams are here to assist you. Responses are typically provided within 24 hours.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger mb-4">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card" style={{ padding: '32px' }}>
        {/* Category selection */}
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label className="form-label" style={{ marginBottom: 12, display: 'block' }}>
            What is your inquiry regarding?
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {CATEGORIES.map(cat => (
              <div
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: `1.5px solid ${category === cat.id ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                  background: category === cat.id ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: category === cat.id ? '#818cf8' : '#e2e8f0' }}>
                  {cat.label}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 3 }}>
                  {cat.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Associated Book */}
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Related Book (Optional)</label>
          <select
            className="form-control"
            value={selectedBookId}
            onChange={(e) => setSelectedBookId(e.target.value)}
          >
            <option value="">-- General / Not specific to one book --</option>
            {books.map(b => (
              <option key={b.book_id} value={b.book_id}>
                {b.title} (ISBN: {b.isbn || 'Pending'} • Status: {b.status})
              </option>
            ))}
          </select>
          <span style={{ fontSize: '0.76rem', color: '#64748b', display: 'block', marginTop: 4 }}>
            Associating a book allows our team to look up manufacturing files, royalty audits, and ISBN records instantly.
          </span>
        </div>

        {/* Subject */}
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Subject / Title</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. Discrepancy in Q3 royalty statement for The Silent Forest"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </div>

        {/* Description */}
        <div className="form-group" style={{ marginBottom: 28 }}>
          <label className="form-label">Detailed Description</label>
          <textarea
            className="form-control"
            rows={6}
            placeholder="Please describe the issue in as much detail as possible. For royalties, mention the period in question. For printing, note the order number or copy batch..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* AI automated classification note */}
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24
        }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
            <strong>AI Auto-Routing:</strong> Our system will automatically evaluate ticket priority, route it to the appropriate desk, and prepare contextual data for the support team.
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate('/author/tickets')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ minWidth: 150 }}
          >
            {submitting ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="spinner spinner-sm" /> Submitting...
              </span>
            ) : (
              'Submit Ticket 🚀'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
