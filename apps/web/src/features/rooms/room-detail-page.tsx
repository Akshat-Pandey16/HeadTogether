import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CalendarClock,
  Copy,
  Hourglass,
  LogOut,
  MapPin,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Shield,
  Trash2,
  Undo2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster";
import { UserAvatar } from "@/components/shared/user-avatar";
import { LoadingPage } from "@/components/shared/loading";
import { RoomMap } from "@/components/map/room-map-lazy";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useConfirm } from "@/providers/confirm-provider";
import { errorMessage } from "@/lib/api-error";
import { formatCoord } from "@/lib/format";
import { purposeMeta } from "@/lib/purpose";
import { useAuth } from "@/providers/auth-provider";
import { useRoomSocket } from "@/features/chat/use-room-socket";
import { EditRoomDialog } from "./edit-room-dialog";
import { RoomDetailsPanel } from "./room-details-panel";
import { RoomEventsPanel } from "./room-events-panel";
import { RoomMembersPanel } from "./room-members-panel";
import { TransferOwnershipDialog } from "./transfer-ownership-dialog";
import {
  useArchiveRoom,
  useDeleteRoom,
  useJoinRoom,
  useLeaveRoom,
  useReactivateRoom,
  useRestoreRoom,
  useRoom,
  useRotateInviteCode,
  useSaveRoom,
} from "./room-queries";
import type { NearbyRoom } from "@/types";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const StatBox = ({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) => (
  <div className="rounded-sm border-2 border-ink bg-card p-3">
    <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="mt-1 font-display text-xl font-bold leading-none">{value}</p>
    {sub && <p className="mt-1 font-mono text-[11px] text-muted-foreground">{sub}</p>}
  </div>
);

export const RoomDetailPage = () => {
  const { roomId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const confirm = useConfirm();
  const room = useRoom(roomId);
  const { coords, request } = useGeolocation(false);
  const joinRoom = useJoinRoom();
  const leaveRoom = useLeaveRoom();
  const saveRoom = useSaveRoom();
  const archive = useArchiveRoom();
  const reactivate = useReactivateRoom();
  const restore = useRestoreRoom();
  const remove = useDeleteRoom();
  const rotateInvite = useRotateInviteCode(roomId);
  const [confirmRotate, setConfirmRotate] = useState(false);

  const isOwner = useMemo(() => room.data?.owner_id === user?.id, [room.data, user?.id]);
  useRoomSocket(room.data?.is_member ? roomId : "");

  if (room.isLoading) return <LoadingPage label="Loading room" />;
  if (!room.data)
    return (
      <div className="grid h-full place-items-center text-muted-foreground">Room not found.</div>
    );

  const r = room.data;
  const meta = purposeMeta(r.purpose);
  const Icon = meta.icon;
  const canManage = r.is_owner || r.role === "moderator";
  const mapRoom: NearbyRoom = { ...r, distance_km: 0 };

  const handleJoin = async () => {
    if (!coords) {
      request();
      toast({ title: "Location required", description: "Grant location to verify you're in range." });
      return;
    }
    try {
      await joinRoom.mutateAsync({ roomId: r.id, latitude: coords.latitude, longitude: coords.longitude });
      toast({ title: "Joined room" });
    } catch (e) {
      toast({ variant: "destructive", title: "Join failed", description: errorMessage(e) });
    }
  };

  const handleLeave = async () => {
    try {
      await leaveRoom.mutateAsync(r.id);
      toast({ title: "Left room" });
    } catch (e) {
      toast({ variant: "destructive", title: "Leave failed", description: errorMessage(e) });
    }
  };

  const toggleSave = async () => {
    try {
      await saveRoom.mutateAsync({ roomId: r.id, save: !r.is_saved });
    } catch (e) {
      toast({ variant: "destructive", title: "Failed", description: errorMessage(e) });
    }
  };

  const copyInvite = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: "Invite code copied" });
    } catch {
      toast({ variant: "destructive", title: "Couldn't copy" });
    }
  };

  const handleRotateInvite = async () => {
    if (!confirmRotate) {
      setConfirmRotate(true);
      return;
    }
    try {
      await rotateInvite.mutateAsync();
      toast({ title: "New invite code generated" });
    } catch (e) {
      toast({ variant: "destructive", description: errorMessage(e) });
    } finally {
      setConfirmRotate(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div
        className="relative border-b-2 border-ink"
        style={{ backgroundColor: r.cover_photo_url ? undefined : meta.color }}
      >
        {r.cover_photo_url ? (
          <>
            <img src={r.cover_photo_url} alt={r.name} className="h-44 w-full object-cover md:h-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
          </>
        ) : (
          <div className="grain relative h-44 w-full overflow-hidden md:h-60">
            <Icon
              className="absolute -bottom-4 right-6 h-32 w-32 text-black/15 md:h-44 md:w-44"
              strokeWidth={1.5}
            />
          </div>
        )}

        <Link
          to="/"
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-sm border-2 border-ink bg-card text-foreground transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
        </Link>

        <div className="absolute right-4 top-4 flex items-center gap-2">
          {r.is_member ? (
            <>
              <Button variant="acid" asChild>
                <Link to={`/rooms/${r.id}/chat`}>
                  <MessageSquare className="h-4 w-4" strokeWidth={2.5} />
                  <span className="hidden sm:inline">Open chat</span>
                </Link>
              </Button>
              {!isOwner && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleLeave}
                  disabled={leaveRoom.isPending}
                  title="Leave room"
                >
                  <LogOut className="h-4 w-4" strokeWidth={2.5} />
                </Button>
              )}
            </>
          ) : (
            <Button variant="acid" onClick={handleJoin} disabled={joinRoom.isPending}>
              {joinRoom.isPending ? "Joining…" : "Join"}
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSave}
            disabled={saveRoom.isPending}
            title={r.is_saved ? "Saved" : "Save"}
          >
            {r.is_saved ? (
              <BookmarkCheck className="h-4 w-4" strokeWidth={2.5} />
            ) : (
              <Bookmark className="h-4 w-4" strokeWidth={2.5} />
            )}
          </Button>
        </div>

        <div
          className={`absolute inset-x-0 bottom-0 p-4 md:p-6 ${r.cover_photo_url ? "text-white" : "text-black"}`}
        >
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-sm border-2 border-ink bg-card px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-foreground">
              <Icon className="h-3 w-3" strokeWidth={2.5} />
              {r.purpose === "custom" && r.custom_purpose ? r.custom_purpose : meta.label}
            </span>
            <span className="rounded-sm border-2 border-ink bg-card px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-foreground">
              {r.visibility}
            </span>
            {r.status !== "active" && (
              <span className="rounded-sm border-2 border-ink bg-destructive px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-destructive-foreground">
                {r.status}
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl font-extrabold leading-none tracking-tight md:text-5xl">
            {r.name}
          </h1>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
        <main className="min-w-0 border-b-2 border-ink p-4 md:p-6 lg:border-b-0 lg:border-r-2">
          <Tabs defaultValue="about">
            <TabsList>
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              {r.is_member && <TabsTrigger value="activity">Activity</TabsTrigger>}
              {canManage && <TabsTrigger value="admin">Admin</TabsTrigger>}
            </TabsList>

            <TabsContent value="about" className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {r.description || "No description provided."}
              </p>
              {r.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {r.tags.map((t) => (
                    <Badge key={t.id} variant="outline">
                      {t.label}
                    </Badge>
                  ))}
                </div>
              )}
              <RoomDetailsPanel roomId={r.id} details={r.details} canManage={canManage} />
              {r.invite_code && (
                <div className="rounded-sm border-2 border-ink bg-card p-4">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Invite code
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="rounded-sm border-2 border-ink bg-secondary px-2 py-1 font-mono text-sm font-bold">
                      {r.invite_code}
                    </code>
                    <Button variant="outline" size="sm" onClick={() => copyInvite(r.invite_code!)}>
                      <Copy className="h-3.5 w-3.5" strokeWidth={2.5} /> Copy
                    </Button>
                    {r.is_owner && (
                      <Button
                        variant={confirmRotate ? "destructive" : "ghost"}
                        size="sm"
                        onClick={handleRotateInvite}
                        disabled={rotateInvite.isPending}
                      >
                        <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.5} />
                        {confirmRotate ? "Confirm" : "Rotate"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="members">
              <RoomMembersPanel roomId={r.id} isOwner={r.is_owner} role={r.role} />
            </TabsContent>

            {r.is_member && (
              <TabsContent value="activity">
                <RoomEventsPanel roomId={r.id} />
              </TabsContent>
            )}

            {canManage && (
              <TabsContent value="admin" className="space-y-4">
                <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <Shield className="h-4 w-4" strokeWidth={2.5} /> Administration
                </div>
                <div className="flex flex-wrap gap-2">
                  <EditRoomDialog room={r} />
                  {r.status === "active" && (
                    <Button variant="outline" onClick={() => archive.mutate(r.id)} disabled={archive.isPending}>
                      <Archive className="h-4 w-4" strokeWidth={2.5} /> Archive
                    </Button>
                  )}
                  {r.status === "archived" && (
                    <Button variant="outline" onClick={() => reactivate.mutate(r.id)} disabled={reactivate.isPending}>
                      <RefreshCw className="h-4 w-4" strokeWidth={2.5} /> Reactivate
                    </Button>
                  )}
                  {r.is_owner && r.status === "deleted" && (
                    <Button variant="outline" onClick={() => restore.mutate(r.id)} disabled={restore.isPending}>
                      <Undo2 className="h-4 w-4" strokeWidth={2.5} /> Restore
                    </Button>
                  )}
                  {r.is_owner && <TransferOwnershipDialog roomId={r.id} currentOwnerId={r.owner_id} />}
                  {r.is_owner && r.status !== "deleted" && (
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        const ok = await confirm({
                          title: "Delete this room?",
                          description: "It can be restored within 7 days, then it's gone for good.",
                          confirmText: "Delete room",
                          destructive: true,
                        });
                        if (!ok) return;
                        await remove.mutateAsync(r.id);
                        navigate("/", { replace: true });
                      }}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2.5} /> Delete
                    </Button>
                  )}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </main>

        <aside className="space-y-4 p-4 md:p-6">
          <div className="flex items-center gap-3 rounded-sm border-2 border-ink bg-card p-3">
            <UserAvatar user={r.owner} className="h-11 w-11" />
            <div className="min-w-0">
              <p className="truncate font-bold leading-tight">
                {r.owner.first_name} {r.owner.last_name}
              </p>
              <Link
                to={`/users/${r.owner.id}`}
                className="font-mono text-[11px] text-muted-foreground hover:text-foreground"
              >
                Host · view profile
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatBox
              label="Members"
              value={`${r.member_count}/${r.max_members}`}
              sub={r.waitlist_count > 0 ? `${r.waitlist_count} waitlisted` : undefined}
            />
            <StatBox label="Radius" value={`${r.radius_km}km`} sub="broadcast range" />
          </div>

          <div className="overflow-hidden rounded-sm border-2 border-ink">
            <div className="h-44">
              <RoomMap
                center={{ latitude: r.latitude, longitude: r.longitude }}
                rooms={[mapRoom]}
                showCenter={false}
                zoom={14}
              />
            </div>
            <div className="flex items-center gap-2 border-t-2 border-ink bg-card px-3 py-2">
              <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
              <span className="font-mono text-[11px] text-muted-foreground">
                {formatCoord(r.latitude, r.longitude)}
              </span>
            </div>
          </div>

          {(r.starts_at || r.ends_at || r.expires_at) && (
            <div className="space-y-2 rounded-sm border-2 border-ink bg-card p-3">
              <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" strokeWidth={2.5} /> Schedule
              </p>
              {r.starts_at && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Starts </span>
                  {formatDate(r.starts_at)}
                </p>
              )}
              {r.ends_at && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Ends </span>
                  {formatDate(r.ends_at)}
                </p>
              )}
              {r.expires_at && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Expires </span>
                  {formatDate(r.expires_at)}
                </p>
              )}
            </div>
          )}

          {r.waitlist_count > 0 && (
            <div className="flex items-center gap-2 rounded-sm border-2 border-dashed border-border p-3 font-mono text-xs text-muted-foreground">
              <Hourglass className="h-4 w-4" strokeWidth={2.5} />
              {r.waitlist_count} waiting · auto-promoted as space frees up
            </div>
          )}

          <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <Users className="h-3.5 w-3.5" strokeWidth={2.5} /> Created{" "}
            {new Date(r.created_at).toLocaleDateString()}
          </p>
        </aside>
      </div>
    </div>
  );
};
