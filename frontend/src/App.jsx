import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginForm from "./components/pages/login/LoginForm";
import DashboardLayout from "./components/pages/dashboard/Dashboard";
import DashboardHome from "./components/pages/dashboard/Components/DashboardHome";
import AllPatients from "./components/pages/dashboard/Components/AllPatients";
import AddNewPatient from "./components/pages/dashboard/Components/AddNewPatient";
import UploadMRI from "./components/pages/dashboard/Components/UploadMRI";
import ClassificationResults from "./components/pages/dashboard/Components/ClassificationResults";
import UploadReport from "./components/pages/dashboard/Components/UploadReport";
import ReportHistory from "./components/pages/dashboard/Components/ReportHistory";
import AuditLogs from "./components/pages/dashboard/Components/AuditLogs";
import UserRoles from "./components/pages/dashboard/Components/UserRoles";
import AllStaffs from "./components/pages/dashboard/Components/AllStaffs";
import AddNewStaff from "./components/pages/dashboard/Components/AddNewStaff";
import ResultViewer from "./components/ResultViewer";
import { clearAuth, fetchCurrentUser, getCurrentUser, getToken } from "./util";

function RoleGuard({ user, allowedRoles, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/forbidden" replace />;
  return children;
}

function Forbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
        <p className="mt-3 text-slate-600">Your role does not have permission to access this page.</p>
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [user, setUser] = useState(getCurrentUser());
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setAuthed(false);
      setUser(null);
      setSessionReady(true);
      return;
    }

    fetchCurrentUser()
      .then((me) => {
        setAuthed(true);
        setUser(me);
      })
      .catch(() => {
        clearAuth();
        setAuthed(false);
        setUser(null);
      })
      .finally(() => setSessionReady(true));
  }, []);

  const handleLogin = (loggedInUser) => {
    setAuthed(true);
    setUser(loggedInUser || getCurrentUser());
  };

  const handleLogout = () => {
    clearAuth();
    setAuthed(false);
    setUser(null);
  };

  if (!sessionReady) {
    return <div className="min-h-screen grid place-items-center text-slate-600">Loading session...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {authed ? (
          <>
            <Route path="/" element={<DashboardLayout user={user} onLogout={handleLogout} />}>
              <Route index element={<DashboardHome />} />
              <Route path="patients">
                <Route index element={<AllPatients />} />
                <Route path="new" element={<AddNewPatient />} />
              </Route>
              <Route path="image">
                <Route path="upload" element={<UploadMRI />} />
                <Route path="results" element={<ClassificationResults />} />
              </Route>
              <Route path="reports">
                <Route path="upload" element={<UploadReport />} />
                <Route path="history" element={<ReportHistory />} />
              </Route>
              <Route path="system">
                <Route
                  path="audit-logs"
                  element={
                    <RoleGuard user={user} allowedRoles={["Super Admin", "Admin"]}>
                      <AuditLogs />
                    </RoleGuard>
                  }
                />
                <Route
                  path="user-roles"
                  element={
                    <RoleGuard user={user} allowedRoles={["Super Admin", "Admin"]}>
                      <UserRoles />
                    </RoleGuard>
                  }
                />
              </Route>
              <Route path="staff">
                <Route
                  index
                  element={
                    <RoleGuard user={user} allowedRoles={["Super Admin", "Admin"]}>
                      <AllStaffs />
                    </RoleGuard>
                  }
                />
                <Route
                  path="new"
                  element={
                    <RoleGuard user={user} allowedRoles={["Super Admin", "Admin"]}>
                      <AddNewStaff />
                    </RoleGuard>
                  }
                />
              </Route>
              <Route path="results/:id" element={<ResultViewer />} />
            </Route>
            <Route path="/forbidden" element={<Forbidden />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/signup" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="/login" element={<LoginForm onLogin={handleLogin} />} />
            <Route path="/forbidden" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}
