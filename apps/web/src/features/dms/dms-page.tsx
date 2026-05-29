import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { dmsApi } from "@/lib/api";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingPage } from "@/components/shared/loading";
import { UserAvatar } from "@/components/shared/user-avatar";
import { relativeTime } from "@/lib/format";
import { initials } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { DirectMessage } from "@/types";

export const DMsPage = () => {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["dms"], queryFn: () => dmsApi.list() });

  if (isLoading) return <LoadingPage label="Loading messages" />;

  const other = (dm: DirectMessage) =>
    dm.participants.find((p) => p.id !== user?.id) ?? dm.participants[0];

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b-2 border-ink bg-card px-4 py-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-sm border-2 border-ink bg-chat text-black">
          <MessageCircle className="h-5 w-5" strokeWidth={2.5} />
        </span>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Messages</h1>
          <p className="font-mono text-[11px] text-muted-foreground">private 1-on-1 threads</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!data || data.length === 0 ? (
          <EmptyState
            icon={<MessageCircle className="h-6 w-6" />}
            title="No conversations yet"
            description="Open someone's profile from a shared room and hit Message to start a DM."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.map((dm) => {
              const peer = other(dm);
              return (
                <Link
                  key={dm.id}
                  to={`/rooms/${dm.id}/chat`}
                  className="group flex items-center gap-3 rounded-sm border-2 border-ink bg-card p-3 transition-[transform,box-shadow] duration-100 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal"
                >
                  {peer ? (
                    <UserAvatar user={peer} className="h-12 w-12" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-sm border-2 border-ink bg-secondary font-mono text-xs font-bold">
                      {initials("D", "M")}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold leading-tight">
                      {peer ? `${peer.first_name} ${peer.last_name}` : "Direct message"}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      opened {relativeTime(dm.created_at)}
                    </p>
                  </div>
                  <MessageCircle
                    className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground"
                    strokeWidth={2.5}
                  />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
