import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Simple auth guard for protected routes
export function RequireAuth() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
            <span className="text-white font-bold text-2xl">X</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Loading XRAIDER...</h2>
            <p className="text-muted-foreground">Setting up your academic workspace</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
