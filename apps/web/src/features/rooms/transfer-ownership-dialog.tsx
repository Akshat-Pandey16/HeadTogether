import { useState } from "react";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { errorMessage } from "@/lib/api-error";
import { useRoomMembers, useTransferOwnership } from "./room-queries";

type Props = { roomId: string; currentOwnerId: string };

export const TransferOwnershipDialog = ({ roomId, currentOwnerId }: Props) => {
  const [open, setOpen] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState<string | undefined>(undefined);
  const members = useRoomMembers(roomId);
  const transfer = useTransferOwnership(roomId);

  const candidates =
    members.data?.items.filter(
      (m) => m.user.id !== currentOwnerId && m.state === "active",
    ) ?? [];

  const submit = async () => {
    if (!newOwnerId) return;
    try {
      await transfer.mutateAsync(newOwnerId);
      toast({ title: "Ownership transferred" });
      setOpen(false);
      setNewOwnerId(undefined);
    } catch (e) {
      toast({ variant: "destructive", description: errorMessage(e) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Crown className="h-4 w-4" /> Transfer ownership
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer ownership</DialogTitle>
          <DialogDescription>
            Pick an active member to become the new owner. You'll become a moderator.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>New owner</Label>
            <Select value={newOwnerId} onValueChange={setNewOwnerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {candidates.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No eligible members.
                  </div>
                ) : (
                  candidates.map((m) => (
                    <SelectItem key={m.user.id} value={m.user.id}>
                      {m.user.first_name} {m.user.last_name} · {m.role}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!newOwnerId || transfer.isPending}>
            {transfer.isPending ? "Transferring…" : "Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
