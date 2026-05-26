import { Outlet } from "react-router-dom";
import { useUserSocket } from "@/features/notifications/use-user-socket";

export const ChatLayout = () => {
  useUserSocket();
  return (
    <div className="flex h-full flex-col">
      <Outlet />
    </div>
  );
};
