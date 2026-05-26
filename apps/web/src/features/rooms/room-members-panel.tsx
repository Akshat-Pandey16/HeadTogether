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
  const members = useRoomMembers(roomId);
  const promote = usePromoteMember(roomId);
  const demote = useDemoteMember(roomId);
  const kick = useKickMember(roomId);

  const canManage = isOwner || role === RoomRole.MODERATOR;

  if (members.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading members…</p>;
  }
  if (!members.data || members.data.items.length === 0) {
    return <p className="text-sm text-muted-foreground">No members yet.</p>;
  }

  return (
    <div className="space-y-2">
      {members.data.items.map((m) => (
        <div
          key={m.user.id}
          className="flex items-center justify-between rounded-md border border-border p-3"
        >
          <div className="flex items-center gap-3">
            <UserAvatar user={m.user} />
            <div>
              <p className="text-sm font-medium">
                {m.user.first_name} {m.user.last_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {m.role === RoomRole.OWNER && <Crown className="mr-1 inline h-3 w-3" />}
                {m.role.charAt(0).toUpperCase() + m.role.slice(1)} · {stateLabel[m.state]}
              </p>
            </div>
          </div>
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
                    if (!window.confirm(`Remove ${m.user.first_name} from this room?`)) return;
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
