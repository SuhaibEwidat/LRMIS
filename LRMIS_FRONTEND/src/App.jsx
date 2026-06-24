import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";

import ApplicantDashboard from "./pages/Applicant/ApplicantDashboard";
import RegistrarDashboard from "./pages/Registrar/RegistrarDashboard";

import SurveyorLayout from "./pages/Surveyor/SurveyorLayout";
import MySurveyTasks from "./pages/Surveyor/MySurveyTasks";
import SurveyTaskExecution from "./pages/Surveyor/SurveyTaskExecution";
import LiveMap from "./pages/Surveyor/LiveMap";
import AnalyticsDashboard from "./pages/Surveyor/AnalyticsDashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/applicant-dashboard" element={<ApplicantDashboard />} />
      <Route path="/registrar-dashboard" element={<RegistrarDashboard />} />

      <Route
        path="/surveyor-dashboard"
        element={<Navigate to="/surveyor/tasks" replace />}
      />

      <Route path="/surveyor" element={<SurveyorLayout />}>
        <Route index element={<Navigate to="tasks" replace />} />
        <Route path="tasks" element={<MySurveyTasks />} />
        <Route path="execution" element={<SurveyTaskExecution />} />
        <Route path="map" element={<LiveMap />} />
        <Route path="analytics" element={<AnalyticsDashboard />} />
      </Route>
    </Routes>
  );
}

export default App;