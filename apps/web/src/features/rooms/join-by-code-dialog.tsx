import { useState } from "react";
import { KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { errorMessage } from "@/lib/api-error";
import { useJoinByCode } from "./room-queries";

export const JoinByCodeDialog = () => {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const joinByCode = useJoinByCode();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = code.trim();
    if (!value) return;
    try {
      const room = await joinByCode.mutateAsync(value);
      toast({ title: "Joined room", description: room.name });
      setOpen(false);
      setCode("");
      navigate(`/rooms/${room.id}`);
    } catch (e) {
      toast({ variant: "destructive", title: "Join failed", description: errorMessage(e) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <KeyRound className="h-4 w-4" /> Join by code
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Join with an invite code</DialogTitle>
          <DialogDescription>
            Paste the invite code shared by the room owner to join immediately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite_code">Invite code</Label>
            <Input
              id="invite_code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              minLength={4}
              maxLength={24}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={joinByCode.isPending}>
              {joinByCode.isPending ? "Joining…" : "Join"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
