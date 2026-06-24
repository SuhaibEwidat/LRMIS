import { Outlet, useNavigate } from "react-router-dom";
import Header from "../components/Header/Header";
import Navigation from "../components/Navigation/Navigation";
import "./SurveyorLayout.css";

function getUserFromStorage() {
  try {
    return JSON.parse(localStorage.getItem("lrmis_user") || "{}");
  } catch {
    return {};
  }
}

function SurveyorLayout() {
  const navigate = useNavigate();
  const user = getUserFromStorage();

  function logout() {
    localStorage.removeItem("lrmis_user");
    localStorage.removeItem("lrmis_token");
    navigate("/login");
  }

  return (
    <div className="surveyor-page">
      <Navigation user={user} onLogout={logout} />

      <main className="surveyor-main">
        <Header
          title="Surveyor Workspace"
          subtitle="Manage field tasks, parcel map, and analytics"
        />

        <Outlet />
      </main>
    </div>
  );
}

export default SurveyorLayout;