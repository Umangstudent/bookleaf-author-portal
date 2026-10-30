import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function NavItem({ to, icon, label }) {
  return (
    <NavLink to={to} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} end={to.split('/').length <= 2}>
      <span className="sidebar-link-icon">{icon}</span>
      {label}
    </NavLink>
  );
}

export default function AuthorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'A';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">📚</div>
            BookLeaf
          </div>
          <div className="sidebar-role-badge">Author Portal</div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          <NavItem to="/author"          icon="🏠" label="Dashboard" />
          <NavItem to="/author/books"    icon="📖" label="My Books" />
          <NavItem to="/author/tickets"  icon="🎫" label="My Tickets" />

          <div className="sidebar-section-label" style={{ marginTop: 8 }}>Actions</div>
          <NavItem to="/author/tickets/new" icon="✏️" label="Submit a Ticket" />
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-email">{user?.email}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-full mt-2" style={{ color: '#94a3b8', fontSize: '0.8rem' }} onClick={handleLogout}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
