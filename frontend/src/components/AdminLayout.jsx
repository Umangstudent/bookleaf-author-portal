import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function NavItem({ to, icon, label, badge }) {
  return (
    <NavLink to={to} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} end={to.split('/').length <= 2}>
      <span className="sidebar-link-icon">{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="badge badge-accent badge-sm">{badge}</span>
      )}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'AD';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">⚡</div>
            BookLeaf
          </div>
          <div className="sidebar-role-badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.4)' }}>
            Admin Portal
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Operations</div>
          <NavItem to="/admin" icon="📊" label="Analytics & Stats" />
          <NavItem to="/admin/tickets" icon="🎫" label="Ticket Queue" />

          <div className="sidebar-section-label" style={{ marginTop: 12 }}>Switch View</div>
          <button 
            className="sidebar-link" 
            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
            onClick={() => navigate('/author')}
          >
            <span className="sidebar-link-icon">👁️</span>
            Preview Author View
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || 'Administrator'}</div>
              <div className="sidebar-user-email">{user?.email || 'admin@bookleaf.com'}</div>
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
