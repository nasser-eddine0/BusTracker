import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from "./i18n";
import Driver from "./pages/Driver";
import Parent from "./pages/Parent";
import Admin from "./pages/Admin";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import RoleSelect from "./pages/RoleSelect";
import ProtectedRoute from "./components/ProtectedRoute";

const pageVariants = {
  initial: { opacity: 0, y: 16, scale: 0.99 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.995,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  },
};

const MotionDiv = motion.div;

function PageTransition({ children }) {
  return (
    <MotionDiv
      className="page-transition"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </MotionDiv>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const routeGroupKey = location.pathname.startsWith("/admin")
    ? "/admin"
    : location.pathname.startsWith("/driver")
      ? "/driver"
    : location.pathname;

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={routeGroupKey}>
        <Route path="/" element={<Navigate to="/choose-role" replace />} />
        <Route
          path="/choose-role"
          element={
            <PageTransition>
              <RoleSelect />
            </PageTransition>
          }
        />
        <Route
          path="/signin"
          element={
            <PageTransition>
              <SignIn />
            </PageTransition>
          }
        />
        <Route
          path="/signup"
          element={
            <PageTransition>
              <SignUp />
            </PageTransition>
          }
        />
        <Route
          path="/driver/*"
          element={
            <PageTransition>
              <ProtectedRoute allowedRoles={["driver"]}>
                <Driver />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/parent"
          element={
            <PageTransition>
              <ProtectedRoute allowedRoles={["parent"]}>
                <Parent />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/admin/*"
          element={
            <PageTransition>
              <ProtectedRoute allowedRoles={["admin"]}>
                <Admin />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route path="*" element={<Navigate to="/choose-role" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <>
      <LanguageProvider>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
      <Toaster
        position="top-center"
        containerStyle={{
          top: 18,
        }}
        toastOptions={{
          duration: 4200,
          style: {
            border: "1px solid rgba(17, 24, 39, 0.09)",
            borderRadius: "24px",
            boxShadow: "0 20px 48px rgba(15, 23, 42, 0.16)",
            color: "#111827",
            fontFamily: "Manrope, Segoe UI, ui-sans-serif, system-ui, sans-serif",
            fontSize: "0.95rem",
            fontWeight: 700,
            lineHeight: "1.45",
            maxWidth: "min(92vw, 520px)",
            minHeight: "58px",
            padding: "14px 18px",
            width: "min(92vw, 520px)",
          },
          success: {
            iconTheme: {
              primary: "#16a34a",
              secondary: "#ffffff",
            },
          },
          error: {
            iconTheme: {
              primary: "#fb7185",
              secondary: "#ffffff",
            },
          },
        }}
      />
      </LanguageProvider>
    </>
  );
}

export default App;
