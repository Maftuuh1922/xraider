import { Dashboard } from "../components/Dashboard";
import { LandingPage } from "../components/LandingPage";
import { RequireAuth } from "../components/RequireAuth";
import { AuthProvider } from "../components/AuthContext";
import { DocumentProvider } from "../components/DocumentContext";
import { Toaster } from "sonner";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../components/AuthContext";

function RootRoutes() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Jika user sudah login dan berada di /, redirect ke /dashboard
  useEffect(() => {
    if (user && location.pathname === '/') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<RequireAuth />}> 
        <Route 
          path="/dashboard" 
          element={
            <DocumentProvider>
              <Dashboard />
            </DocumentProvider>
          } 
        />
      </Route>
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RootRoutes />
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}
