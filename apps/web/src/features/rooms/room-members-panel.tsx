import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Crown, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/shared/user-avatar";
import { toast } from "@/components/ui/toaster";
import { useConfirm } from "@/providers/confirm-provider";
import { errorMessage } from "@/lib/api-error";
import { RoomRole, type MembershipState } from "@/types";
import {
  useDemoteMember,
  useKickMember,
  usePromoteMember,
  useRoomMembers,
} from "./room-queries";

type Props = {
  roomId: string;
  isOwner: boolean;
  role: string | null;
};

const stateLabel: Record<MembershipState, string> = {
  active: "Active",
  waitlisted: "Waitlisted",
  banned: "Banned",
};

export const RoomMembersPanel = ({ roomId, isOwner, role }: Props) => {
  const confirm = useConfirm();
  const members = useRoomMembers(roomId);
  const promote = usePromoteMember(roomId);
  const demote = useDemoteMember(roomId);
  const kick = useKickMember(roomId);

  const canManage = isOwner || role === RoomRole.MODERATOR;

  if (members.isLoading) {
    return <p className="font-mono text-xs text-muted-foreground">Loading members…</p>;
  }
  if (!members.data || members.data.items.length === 0) {
    return <p className="font-mono text-xs text-muted-foreground">No members yet.</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {members.data.items.map((m) => (
        <div
          key={m.user.id}
          className="flex items-center justify-between gap-2 rounded-sm border-2 border-ink bg-card p-2.5"
        >
          <Link to={`/users/${m.user.id}`} className="flex min-w-0 items-center gap-3">
            <UserAvatar user={m.user} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {m.user.first_name} {m.user.last_name}
              </p>
              <p className="flex items-center gap-1 font-mono text-[10px] uppercase text-muted-foreground">
                {m.role === RoomRole.OWNER && <Crown className="h-3 w-3" strokeWidth={2.5} />}
                {m.role} · {stateLabel[m.state]}
              </p>
            </div>
          </Link>
          {canManage && m.role !== RoomRole.OWNER && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  Manage
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwner && m.role === RoomRole.MEMBER && (
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        await promote.mutateAsync(m.user.id);
                        toast({ title: "Promoted to moderator" });
                      } catch (e) {
                        toast({ variant: "destructive", description: errorMessage(e) });
                      }
                    }}
                  >
                    <ChevronUp className="mr-2 h-4 w-4" /> Promote
                  </DropdownMenuItem>
                )}
                {isOwner && m.role === RoomRole.MODERATOR && (
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        await demote.mutateAsync(m.user.id);
                        toast({ title: "Demoted to member" });
                      } catch (e) {
                        toast({ variant: "destructive", description: errorMessage(e) });
                      }
                    }}
                  >
                    <ChevronDown className="mr-2 h-4 w-4" /> Demote
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={async () => {
                    const ok = await confirm({
                      title: `Remove ${m.user.first_name}?`,
                      description: "They'll be removed from this room.",
                      confirmText: "Remove",
                      destructive: true,
                    });
                    if (!ok) return;
                    try {
                      await kick.mutateAsync(m.user.id);
                      toast({ title: "Member removed" });
                    } catch (e) {
                      toast({ variant: "destructive", description: errorMessage(e) });
                    }
                  }}
                >
                  <UserMinus className="mr-2 h-4 w-4" /> Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ))}
    </div>
  );
};
