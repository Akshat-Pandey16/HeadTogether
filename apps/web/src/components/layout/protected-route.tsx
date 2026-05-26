import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingPage } from "@/components/shared/loading";
import { useAuth } from "@/providers/auth-provider";

export const ProtectedRoute = () => {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <LoadingPage />;
  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
};

export const PublicOnlyRoute = () => {
  const { status } = useAuth();
  if (status === "loading") return <LoadingPage />;
  if (status === "authenticated") return <Navigate to="/" replace />;
  return <Outlet />;
};
