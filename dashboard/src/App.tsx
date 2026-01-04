import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LoginPage } from "@/pages/LoginPage";
import { FormsListPage } from "@/pages/FormsListPage";
import { SubmissionsPage } from "@/pages/SubmissionsPage";
import { SubmissionDetailPage } from "@/pages/SubmissionDetailPage";
import { FormSettingsPage } from "@/pages/FormSettingsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<FormsListPage />} />
        <Route path="forms/:formId" element={<SubmissionsPage />} />
        <Route path="forms/:formId/submissions/:submissionId" element={<SubmissionDetailPage />} />
        <Route path="forms/:formId/settings" element={<FormSettingsPage />} />
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}

export default App;
