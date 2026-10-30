// Central API service — all backend calls go through here
const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('bookleaf_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    },
    ...options
  });

  if (res.status === 204) return null;

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error || `Request failed: ${res.status}`);
    err.code = data.code;
    err.status = res.status;
    throw err;
  }
  return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  login:  (email, password, role) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, role }) }),
  me:     ()                       => request('/auth/me'),
  logout: ()                       => request('/auth/logout', { method: 'POST' })
};

// ─── Books ────────────────────────────────────────────────────────────────────
export const books = {
  myBooks: ()         => request('/books/my'),
  getBook: (bookId)   => request(`/books/${bookId}`)
};

// ─── Tickets ──────────────────────────────────────────────────────────────────
export const tickets = {
  list:       (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/tickets${qs ? `?${qs}` : ''}`);
  },
  create:     (data)        => request('/tickets', { method: 'POST', body: JSON.stringify(data) }),
  get:        (id)          => request(`/tickets/${id}`),
  update:     (id, data)    => request(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  addMessage: (id, data)    => request(`/tickets/${id}/messages`, { method: 'POST', body: JSON.stringify(data) }),
  getAIDraft: (id)          => request(`/tickets/${id}/ai-draft`),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const admin = {
  stats:     ()          => request('/admin/stats'),
  authors:   ()          => request('/admin/authors'),
  getAuthor: (authorId)  => request(`/admin/authors/${authorId}`),
  admins:    ()          => request('/admin/admins'),
};

export default { auth, books, tickets, admin };
