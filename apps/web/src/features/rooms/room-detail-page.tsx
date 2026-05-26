import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster";
import { UserAvatar } from "@/components/shared/user-avatar";
import { LoadingPage } from "@/components/shared/loading";
import { useGeolocation } from "@/hooks/use-geolocation";
import { errorMessage } from "@/lib/api-error";
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

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const RoomDetailPage = () => {
  const { roomId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
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

  if (room.isLoading) return <LoadingPage />;
  if (!room.data) return <div className="p-10 text-center text-muted-foreground">Not found.</div>;

  const r = room.data;
  const canManage = r.is_owner || r.role === "moderator";

  const handleJoin = async () => {
    if (!coords) {
      request();
      toast({
        title: "Location required",
        description: "Grant location to verify you're within radius.",
      });
      return;
    }
    try {
      await joinRoom.mutateAsync({
        roomId: r.id,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
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
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 md:px-6">
      {r.cover_photo_url && (
        <div className="aspect-[3/1] w-full overflow-hidden rounded-xl bg-muted">
          <img
            src={r.cover_photo_url}
            alt={r.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{r.name}</h1>
            <Badge variant="secondary">
              {r.purpose === "custom" && r.custom_purpose ? r.custom_purpose : r.purpose}
            </Badge>
            {r.status !== "active" && <Badge variant="outline">{r.status}</Badge>}
            <Badge variant="outline">{r.visibility}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {r.description ?? "No description provided."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {r.is_member ? (
            <>
              <Button asChild>
                <a href={`/rooms/${r.id}/chat`}>
                  <MessageSquare className="h-4 w-4" /> Open chat
                </a>
              </Button>
              {!isOwner && (
                <Button variant="outline" onClick={handleLeave} disabled={leaveRoom.isPending}>
                  <LogOut className="h-4 w-4" /> Leave
                </Button>
              )}
            </>
          ) : (
            <Button onClick={handleJoin} disabled={joinRoom.isPending}>
              {joinRoom.isPending ? "Joining…" : "Join room"}
            </Button>
          )}
          <Button variant="ghost" onClick={toggleSave} disabled={saveRoom.isPending}>
            {r.is_saved ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
            {r.is_saved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Owner</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <UserAvatar user={r.owner} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {r.owner.first_name} {r.owner.last_name}
              </p>
              <p className="text-xs text-muted-foreground">Owner</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" /> Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{r.member_count}</p>
            <p className="text-xs text-muted-foreground">
              of {r.max_members} allowed
              {r.waitlist_count > 0 && (
                <>
                  {" · "}
                  <span className="inline-flex items-center gap-1">
                    <Hourglass className="h-3 w-3" />
                    {r.waitlist_count} waitlisted
                  </span>
                </>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4" /> Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {r.latitude.toFixed(3)}, {r.longitude.toFixed(3)}
            </p>
            <p className="text-xs text-muted-foreground">{r.radius_km} km radius</p>
          </CardContent>
        </Card>
      </div>

      {(r.starts_at || r.ends_at || r.expires_at) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4" /> Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {r.starts_at && (
              <p>
                <span className="text-muted-foreground">Starts: </span>
                {formatDate(r.starts_at)}
              </p>
            )}
            {r.ends_at && (
              <p>
                <span className="text-muted-foreground">Ends: </span>
                {formatDate(r.ends_at)}
              </p>
            )}
            {r.expires_at && (
              <p>
                <span className="text-muted-foreground">Auto-expires: </span>
                {formatDate(r.expires_at)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="about">
        <TabsList>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          {r.is_member && <TabsTrigger value="activity">Activity</TabsTrigger>}
          {canManage && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>

        <TabsContent value="about" className="space-y-4">
          <RoomDetailsPanel roomId={r.id} details={r.details} canManage={canManage} />
          {r.invite_code && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Invite code</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                <code className="rounded bg-muted px-2 py-1 text-sm">{r.invite_code}</code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyInvite(r.invite_code as string)}
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
                {r.is_owner && (
                  <Button
                    variant={confirmRotate ? "destructive" : "ghost"}
                    size="sm"
                    onClick={handleRotateInvite}
                    disabled={rotateInvite.isPending}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {confirmRotate ? "Confirm rotate" : "Rotate"}
                  </Button>
                )}
              </CardContent>
            </Card>
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
          <TabsContent value="admin" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4" /> Administration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Use these actions carefully. Archiving stops chat; deleting can be restored
                  within 7 days.
                </p>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  <EditRoomDialog room={r} />
                  {r.status === "active" && (
                    <Button
                      variant="outline"
                      onClick={() => archive.mutate(r.id)}
                      disabled={archive.isPending}
                    >
                      <Archive className="h-4 w-4" /> Archive
                    </Button>
                  )}
                  {r.status === "archived" && (
                    <Button
                      variant="outline"
                      onClick={() => reactivate.mutate(r.id)}
                      disabled={reactivate.isPending}
                    >
                      <RefreshCw className="h-4 w-4" /> Reactivate
                    </Button>
                  )}
                  {r.is_owner && r.status === "deleted" && (
                    <Button
                      variant="outline"
                      onClick={() => restore.mutate(r.id)}
                      disabled={restore.isPending}
                    >
                      <Undo2 className="h-4 w-4" /> Restore
                    </Button>
                  )}
                  {r.is_owner && <TransferOwnershipDialog roomId={r.id} currentOwnerId={r.owner_id} />}
                  {r.is_owner && r.status !== "deleted" && (
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        if (!window.confirm("Delete room? This can be restored within 7 days.")) {
                          return;
                        }
                        await remove.mutateAsync(r.id);
                        navigate("/", { replace: true });
                      }}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
