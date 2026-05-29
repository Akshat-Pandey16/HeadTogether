import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Shield, ShieldOff, UserPen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/shared/loading";
import { UserAvatar } from "@/components/shared/user-avatar";
import { PageHeader } from "@/components/layout/page-header";
import { toast } from "@/components/ui/toaster";
import { dmsApi, moderationApi, usersApi } from "@/lib/api";
import { errorMessage } from "@/lib/api-error";
import { useAuth } from "@/providers/auth-provider";
import { ReportTarget } from "@/types";
import { ReportDialog } from "@/features/moderation/report-dialog";

export const ProfilePage = () => {
  const { userId = "" } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const isMe = me?.id === userId;

  const profile = useQuery({
    queryKey: ["users", userId],
    queryFn: () => usersApi.profile(userId),
    enabled: !!userId,
  });

  const blocked = useQuery({
    queryKey: ["moderation", "blocks"],
    queryFn: () => moderationApi.listBlocked(),
    enabled: !!me && !isMe,
  });
  const isBlocked = (blocked.data ?? []).some((u) => u.id === userId);

  const block = useMutation({
    mutationFn: () => moderationApi.block(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderation", "blocks"] });
      toast({ title: "User blocked" });
    },
    onError: (e) => toast({ variant: "destructive", description: errorMessage(e) }),
  });
  const unblock = useMutation({
    mutationFn: () => moderationApi.unblock(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderation", "blocks"] });
      toast({ title: "User unblocked" });
    },
    onError: (e) => toast({ variant: "destructive", description: errorMessage(e) }),
  });
  const startDm = useMutation({
    mutationFn: () => dmsApi.createOrGet(userId),
    onSuccess: (room) => {
      qc.invalidateQueries({ queryKey: ["dms"] });
      navigate(`/rooms/${room.id}/chat`);
    },
    onError: (e) => toast({ variant: "destructive", description: errorMessage(e) }),
  });

  if (profile.isLoading) return <LoadingPage label="Loading profile" />;
  if (!profile.data)
    return <div className="grid h-full place-items-center text-muted-foreground">Profile not found.</div>;

  const u = profile.data;
  const blockPending = block.isPending || unblock.isPending;

  return (
    <div className="flex h-full flex-col">
      <PageHeader>
        <Button variant="outline" size="icon" onClick={() => navigate(-1)} title="Back">
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
        </Button>
        <h1 className="truncate font-display text-xl font-extrabold tracking-tight">
          {isMe ? "Your profile" : `${u.first_name} ${u.last_name}`}
        </h1>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {isMe ? (
            <Button variant="outline" onClick={() => navigate("/settings")}>
              <UserPen className="h-4 w-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          ) : (
            <>
              <Button variant="acid" onClick={() => startDm.mutate()} disabled={startDm.isPending}>
                <MessageCircle className="h-4 w-4" strokeWidth={2.5} />
                <span className="hidden sm:inline">Message</span>
              </Button>
              {isBlocked ? (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => unblock.mutate()}
                  disabled={blockPending}
                  title="Unblock"
                >
                  <ShieldOff className="h-4 w-4" strokeWidth={2.5} />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => block.mutate()}
                  disabled={blockPending}
                  title="Block"
                >
                  <Shield className="h-4 w-4" strokeWidth={2.5} />
                </Button>
              )}
              <ReportDialog targetType={ReportTarget.USER} targetId={userId} />
            </>
          )}
        </div>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b-2 border-ink bg-acid">
          <div className="grain h-20 w-full md:h-28" />
        </div>

        <div className="px-4 md:px-8">
          <div className="-mt-10 flex items-end gap-4">
            <UserAvatar user={u} className="h-24 w-24" />
            <div className="pb-1">
              <h2 className="font-display text-2xl font-extrabold leading-none tracking-tight">
                {u.first_name} {u.last_name}
              </h2>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                {u.gender.replace(/_/g, " ")} · {u.age}
              </p>
            </div>
          </div>

          <div className="grid gap-4 py-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <section className="rounded-sm border-2 border-ink bg-card p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Bio
              </p>
              <p className="mt-2 text-sm leading-relaxed">
                {u.bio || <span className="text-muted-foreground">No bio yet.</span>}
              </p>
            </section>

            <section className="rounded-sm border-2 border-ink bg-card p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Interests
              </p>
              {u.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {u.tags.map((t) => (
                    <Badge key={t.id} variant="outline">
                      {t.label}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No interests added.</p>
              )}
            </section>
          </div>

          {isBlocked && !isMe && (
            <aside className="h-fit rounded-sm border-2 border-destructive bg-destructive/10 p-4">
              <p className="flex items-center gap-2 font-bold text-destructive">
                <Shield className="h-4 w-4" strokeWidth={2.5} /> Blocked
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                You won't see each other's rooms, messages, or be able to DM.
              </p>
            </aside>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};
