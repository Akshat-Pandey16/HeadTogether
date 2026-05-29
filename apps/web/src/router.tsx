import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/layout/protected-route";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { ForgotPasswordPage } from "@/features/auth/forgot-password-page";
import { LoginPage } from "@/features/auth/login-page";
import { RegisterPage } from "@/features/auth/register-page";
import { ResetPasswordPage } from "@/features/auth/reset-password-page";
import { ChatPage } from "@/features/chat/chat-page";
import { DMsPage } from "@/features/dms/dms-page";
import { NotificationsPage } from "@/features/notifications/notifications-page";
import { ProfilePage } from "@/features/profile/profile-page";
import { SettingsPage } from "@/features/profile/settings-page";
import { RoomDetailPage } from "@/features/rooms/room-detail-page";
import { RoomsListPage } from "@/features/rooms/rooms-list-page";

const withBoundary = (node: React.ReactNode) => <ErrorBoundary>{node}</ErrorBoundary>;

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: "/login", element: withBoundary(<LoginPage />) },
      { path: "/register", element: withBoundary(<RegisterPage />) },
      { path: "/forgot-password", element: withBoundary(<ForgotPasswordPage />) },
      { path: "/reset-password", element: withBoundary(<ResetPasswordPage />) },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: withBoundary(<RoomsListPage />) },
          { path: "rooms/:roomId", element: withBoundary(<RoomDetailPage />) },
          { path: "rooms/:roomId/chat", element: withBoundary(<ChatPage />) },
          { path: "dms", element: withBoundary(<DMsPage />) },
          { path: "notifications", element: withBoundary(<NotificationsPage />) },
          { path: "users/:userId", element: withBoundary(<ProfilePage />) },
          { path: "settings", element: withBoundary(<SettingsPage />) },
        ],
      },
    ],
  },
  { path: "*", element: <div className="p-10 text-center">Not found.</div> },
]);
