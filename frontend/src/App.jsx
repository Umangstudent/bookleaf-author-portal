import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Pages
import Login from './pages/Login';

// Author pages
import AuthorLayout from './components/AuthorLayout';
import AuthorDashboard from './pages/author/Dashboard';
import MyBooks from './pages/author/MyBooks';
import SubmitTicket from './pages/author/SubmitTicket';
import MyTickets from './pages/author/MyTickets';
import AuthorTicketDetail from './pages/author/TicketDetail';

// Admin pages
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import TicketQueue from './pages/admin/TicketQueue';
import AdminTicketDetail from './pages/admin/TicketDetail';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner spinner-lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;
  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner spinner-lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/author'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />

          {/* Author Routes */}
          <Route path="/author" element={
            <ProtectedRoute role="author"><AuthorLayout /></ProtectedRoute>
          }>
            <Route index element={<AuthorDashboard />} />
            <Route path="books" element={<MyBooks />} />
            <Route path="tickets" element={<MyTickets />} />
            <Route path="tickets/new" element={<SubmitTicket />} />
            <Route path="tickets/:ticketId" element={<AuthorTicketDetail />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="tickets" element={<TicketQueue />} />
            <Route path="tickets/:ticketId" element={<AdminTicketDetail />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
