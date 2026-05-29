import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useUserSocket } from "@/features/notifications/use-user-socket";
import { CreateRoomDialog } from "@/features/rooms/create-room-dialog";
import { Sidebar } from "./sidebar";
import { MobileBottomNav, MobileTopBar } from "./mobile-nav";

export const AppLayout = () => {
  useUserSocket();
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <div className="flex h-full w-full overflow-hidden">
      <Sidebar onCreateRoom={() => setCreateOpen(true)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
        <MobileBottomNav />
      </div>
      <CreateRoomDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};
