import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { WithdrawalsPage } from './pages/WithdrawalsPage';
import { TasksPage } from './pages/TasksPage';
import { OffersPage } from './pages/OffersPage';
import { UsersPage } from './pages/UsersPage';
import { SecurityPage } from './pages/SecurityPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { AdminsPage } from './pages/AdminsPage';

function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060913]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
          <p className="text-xs font-medium text-slate-400">Verifying administrator session...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedShell>
                  <OverviewPage />
                </ProtectedShell>
              }
            />
            <Route
              path="/withdrawals"
              element={
                <ProtectedShell>
                  <WithdrawalsPage />
                </ProtectedShell>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedShell>
                  <TasksPage />
                </ProtectedShell>
              }
            />
            <Route
              path="/offers"
              element={
                <ProtectedShell>
                  <OffersPage />
                </ProtectedShell>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedShell>
                  <UsersPage />
                </ProtectedShell>
              }
            />
            <Route
              path="/security"
              element={
                <ProtectedShell>
                  <SecurityPage />
                </ProtectedShell>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedShell>
                  <SettingsPage />
                </ProtectedShell>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <ProtectedShell>
                  <AuditLogsPage />
                </ProtectedShell>
              }
            />
            <Route
              path="/admins"
              element={
                <ProtectedShell>
                  <AdminsPage />
                </ProtectedShell>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
