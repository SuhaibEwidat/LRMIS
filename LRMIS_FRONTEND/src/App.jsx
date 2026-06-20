import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";

import SurveyorPage from "./pages/Surveyor/SurveyorPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/applicant-dashboard"
          element={<h1>Applicant Dashboard</h1>}
        />

        <Route path="/surveyor" element={<SurveyorPage />} />

        <Route path="/registrar" element={<h1>Registrar Page</h1>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;