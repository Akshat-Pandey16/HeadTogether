import { useState } from "react";
import { Pencil } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { errorMessage } from "@/lib/api-error";
import { RoomVisibility, type RoomDetailed } from "@/types";
import { useUpdateRoom } from "./room-queries";

type Props = { room: RoomDetailed };

const toLocal = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const tzOffset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
};

const fromLocal = (value: string): string | null => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

const EditRoomForm = ({
  room,
  onClose,
}: {
  room: RoomDetailed;
  onClose: () => void;
}) => {
  const update = useUpdateRoom(room.id);
  const [name, setName] = useState(room.name);
  const [radius, setRadius] = useState(room.radius_km);
  const [maxMembers, setMaxMembers] = useState(room.max_members);
  const [visibility, setVisibility] = useState<RoomVisibility>(room.visibility);
  const [description, setDescription] = useState(room.description ?? "");
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(room.cover_photo_url ?? "");
  const [startsAt, setStartsAt] = useState(toLocal(room.starts_at));
  const [endsAt, setEndsAt] = useState(toLocal(room.ends_at));
  const [expiresAt, setExpiresAt] = useState(toLocal(room.expires_at));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await update.mutateAsync({
        name,
        radius_km: radius,
        max_members: maxMembers,
        visibility,
        description: description || null,
        cover_photo_url: coverPhotoUrl || null,
        starts_at: fromLocal(startsAt),
        ends_at: fromLocal(endsAt),
        expires_at: fromLocal(expiresAt),
      });
      toast({ title: "Room updated" });
      onClose();
    } catch (e) {
      toast({ variant: "destructive", title: "Update failed", description: errorMessage(e) });
    }
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="space-y-2">
        <Label htmlFor="edit_name">Name</Label>
        <Input
          id="edit_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={120}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="edit_radius">Radius (km)</Label>
          <Input
            id="edit_radius"
            type="number"
            min={0.1}
            max={200}
            step={0.1}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit_max">Max members</Label>
          <Input
            id="edit_max"
            type="number"
            min={2}
            max={500}
            value={maxMembers}
            onChange={(e) => setMaxMembers(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit_visibility">Visibility</Label>
        <Select value={visibility} onValueChange={(v) => setVisibility(v as RoomVisibility)}>
          <SelectTrigger id="edit_visibility">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={RoomVisibility.PUBLIC}>Public</SelectItem>
            <SelectItem value={RoomVisibility.PRIVATE}>Private (invite only)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit_description">Description</Label>
        <Textarea
          id="edit_description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit_cover">Cover photo URL</Label>
        <Input
          id="edit_cover"
          type="url"
          value={coverPhotoUrl}
          onChange={(e) => setCoverPhotoUrl(e.target.value)}
          maxLength={500}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="edit_starts">Starts at</Label>
          <Input
            id="edit_starts"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit_ends">Ends at</Label>
          <Input
            id="edit_ends"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit_expires">Auto-expire at</Label>
        <Input
          id="edit_expires"
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export const EditRoomDialog = ({ room }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil className="h-4 w-4" /> Edit room
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit room</DialogTitle>
          <DialogDescription>Update room metadata and schedule.</DialogDescription>
        </DialogHeader>
        {open && <EditRoomForm room={room} onClose={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
};
