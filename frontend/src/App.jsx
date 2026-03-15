import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginForm from "./components/pages/login/LoginForm";
import SignupForm from "./components/pages/login/SignupForm";
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
import { getToken } from "./util";

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());

  return (
    <BrowserRouter>
      <Routes>
        {authed ? (
          <>
            <Route path="/" element={<DashboardLayout onLogout={() => setAuthed(false)} />}>
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
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="user-roles" element={<UserRoles />} />
              </Route>
              <Route path="staff">
                <Route index element={<AllStaffs />} />
                <Route path="new" element={<AddNewStaff />} />
              </Route>
              <Route path="results/:id" element={<ResultViewer />} />
            </Route>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/signup" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="/login" element={<LoginForm onLogin={() => setAuthed(true)} />} />
            <Route path="/signup" element={<SignupForm onSignup={() => setAuthed(true)} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}
