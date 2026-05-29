import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useUserSocket } from "@/features/notifications/use-user-socket";
import { CreateRoomDialog } from "@/features/rooms/create-room-dialog";
import { Sidebar } from "./sidebar";
import { MobileBottomNav } from "./mobile-nav";

export const AppLayout = () => {
  useUserSocket();
  const location = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const section = "/" + (location.pathname.split("/")[1] ?? "");
  const inChat = location.pathname.endsWith("/chat");

  return (
    <div className="flex h-full w-full overflow-hidden">
      <Sidebar onCreateRoom={() => setCreateOpen(true)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
        {!inChat && <MobileBottomNav />}
      </div>
      <CreateRoomDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};
