import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';
import MainLayout from './layouts/MainLayout';
import ProvidersPage from './pages/ProvidersPage';
import ModelsPage from './pages/ModelsPage';
import SystemsPage from './pages/SystemsPage';
import HardwarePage from './pages/HardwarePage';
import ChatPage from './pages/ChatPage';
import BenchmarkPage from './pages/BenchmarkPage';
import ToolsPage from './pages/ToolsPage';
import RoutingPage from './pages/RoutingPage';

// Placeholder pages - will be implemented in subsequent phases
const DashboardPage = () => <div>Dashboard</div>;
const SettingsPage = () => <div>Settings</div>;
const AdminPage = () => <div>Admin</div>;

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="providers" element={<ProvidersPage />} />
        <Route path="models" element={<ModelsPage />} />
        <Route path="systems" element={<SystemsPage />} />
        <Route path="hardware" element={<HardwarePage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="benchmark" element={<BenchmarkPage />} />
        <Route path="tools" element={<ToolsPage />} />
        <Route path="routing" element={<RoutingPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
