import { useState } from "react";
import { Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { useGeolocation } from "@/hooks/use-geolocation";
import { errorMessage } from "@/lib/api-error";
import { RoomPurpose, RoomVisibility } from "@/types";
import { useCreateRoom } from "./room-queries";

const purposes: { value: RoomPurpose; label: string }[] = [
  { value: RoomPurpose.PLAY, label: "Play" },
  { value: RoomPurpose.MOVIE, label: "Movie" },
  { value: RoomPurpose.TRAVEL, label: "Travel" },
  { value: RoomPurpose.CHAT, label: "Chat" },
  { value: RoomPurpose.LANDMARK, label: "Landmark" },
  { value: RoomPurpose.CUSTOM, label: "Custom" },
];

export const CreateRoomDialog = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { coords, request } = useGeolocation(false);
  const createRoom = useCreateRoom();
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState<RoomPurpose>(RoomPurpose.CHAT);
  const [customPurpose, setCustomPurpose] = useState("");
  const [radius, setRadius] = useState(5);
  const [maxMembers, setMaxMembers] = useState(50);
  const [visibility, setVisibility] = useState<RoomVisibility>(RoomVisibility.PUBLIC);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  const reset = () => {
    setName("");
    setPurpose(RoomPurpose.CHAT);
    setCustomPurpose("");
    setRadius(5);
    setMaxMembers(50);
    setVisibility(RoomVisibility.PUBLIC);
    setDescription("");
    setTags("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords) {
      toast({
        variant: "destructive",
        title: "Location required",
        description: "Allow location access to anchor the room.",
      });
      request();
      return;
    }
    try {
      const room = await createRoom.mutateAsync({
        name,
        purpose,
        custom_purpose: purpose === RoomPurpose.CUSTOM ? customPurpose : undefined,
        latitude: coords.latitude,
        longitude: coords.longitude,
        radius_km: radius,
        max_members: maxMembers,
        visibility,
        description: description || undefined,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      toast({ title: "Room created", description: room.name });
      setOpen(false);
      reset();
      navigate(`/rooms/${room.id}`);
    } catch (e) {
      toast({ variant: "destructive", title: "Create failed", description: errorMessage(e) });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && !coords) request();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New room
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create a room</DialogTitle>
          <DialogDescription>
            Rooms are anchored to your current location. Only people within radius can find it.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Select value={purpose} onValueChange={(v) => setPurpose(v as RoomPurpose)}>
                <SelectTrigger id="purpose">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {purposes.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v as RoomVisibility)}
              >
                <SelectTrigger id="visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={RoomVisibility.PUBLIC}>Public</SelectItem>
                  <SelectItem value={RoomVisibility.PRIVATE}>Private (invite only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {purpose === RoomPurpose.CUSTOM && (
            <div className="space-y-2">
              <Label htmlFor="custom">Custom purpose</Label>
              <Input
                id="custom"
                value={customPurpose}
                onChange={(e) => setCustomPurpose(e.target.value)}
                required
                maxLength={60}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="radius">Radius (km)</Label>
              <Input
                id="radius"
                type="number"
                min={0.1}
                max={200}
                step={0.1}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max">Max members</Label>
              <Input
                id="max"
                type="number"
                min={2}
                max={500}
                value={maxMembers}
                onChange={(e) => setMaxMembers(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              placeholder="What's the plan?"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="movies, weekend, downtown"
            />
            <p className="text-xs text-muted-foreground">Comma-separated, up to 20.</p>
          </div>
          {!coords && (
            <p className="text-xs text-destructive">
              We need your location to anchor this room.
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createRoom.isPending}>
              {createRoom.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
