import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { MessageCircle } from "lucide-react";
import { dmsApi } from "@/lib/api";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingPage } from "@/components/shared/loading";
import { UserAvatar } from "@/components/shared/user-avatar";
import { PageHeader, PageTitle } from "@/components/layout/page-header";
import { fadeUp, staggerContainer } from "@/components/shared/motion";
import { relativeTime } from "@/lib/format";
import { initials } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { DirectMessage } from "@/types";

const MotionLink = motion.create(Link);

export const DMsPage = () => {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["dms"], queryFn: () => dmsApi.list() });

  if (isLoading) return <LoadingPage label="Loading messages" />;

  const other = (dm: DirectMessage) =>
    dm.participants.find((p) => p.id !== user?.id) ?? dm.participants[0];

  return (
    <div className="flex h-full flex-col">
      <PageHeader>
        <PageTitle
          icon={<MessageCircle className="h-5 w-5" strokeWidth={2.5} />}
          title="Messages"
          subtitle="private 1-on-1 threads"
          tint="hsl(var(--chat))"
        />
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!data || data.length === 0 ? (
          <EmptyState
            icon={<MessageCircle className="h-6 w-6" />}
            title="No conversations yet"
            description="Open someone's profile from a shared room and hit Message to start a DM."
          />
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {data.map((dm) => {
              const peer = other(dm);
              return (
                <MotionLink
                  key={dm.id}
                  to={`/rooms/${dm.id}/chat`}
                  variants={fadeUp}
                  whileHover={{ y: -4 }}
                  whileTap={{ y: -1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  className="group flex items-center gap-3 rounded-sm border-2 border-ink bg-card p-3 transition-colors hover:border-acid"
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
                </MotionLink>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
};
