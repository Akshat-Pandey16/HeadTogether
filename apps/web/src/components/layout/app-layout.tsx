import { Outlet } from "react-router-dom";
import { useUserSocket } from "@/features/notifications/use-user-socket";
import { TopNav } from "./top-nav";

export const AppLayout = () => {
  useUserSocket();
  return (
    <div className="flex h-full flex-col">
      <TopNav />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
