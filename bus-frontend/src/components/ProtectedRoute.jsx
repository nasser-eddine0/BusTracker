import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContextObject";

function getDashboardPath(role) {
  if (role === "admin") return "/admin";
  if (role === "driver") return "/driver";
  if (role === "parent") return "/parent";
  return "/choose-role";
}

function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();
  const { loading, user, role } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-6">
        <section className="flex w-full max-w-md flex-col items-center rounded-[32px] border border-line bg-white/92 px-8 py-10 text-center shadow-[var(--shadow-panel)] backdrop-blur-sm">
          <img
            src="/school-bus.gif"
            alt="Loading school bus"
            className="h-44 w-44 object-contain"
          />
          <div className="mt-4 space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-main">
              Loading your dashboard
            </h2>
            <p className="text-sm text-muted">
              Checking your access...
            </p>
          </div>
          <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-card-soft">
            <div className="loading-bus-bar h-full w-1/3 rounded-full bg-accent" />
          </div>
        </section>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getDashboardPath(role)} replace />;
  }

  return children;
}

export default ProtectedRoute;
