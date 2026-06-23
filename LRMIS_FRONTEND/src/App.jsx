import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import SurveyorPage from "./pages/Surveyor/SurveyorPage";
import ApplicantDashboard from "./pages/Applicant/ApplicantDashboard";
import RegistrarDashboard from "./pages/Registrar/RegistrarDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/surveyor" element={<SurveyorPage />} />

        <Route path="*" element={<Navigate to="/login" replace />} />
        <Route path="/registrar-dashboard" element={<RegistrarDashboard />} />
        <Route path="/applicant-dashboard" element={<ApplicantDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;