import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crosshair, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { formatCoord } from "@/lib/format";
import { PURPOSE_OPTIONS } from "@/lib/purpose";
import { cn } from "@/lib/utils";
import { RoomPurpose, RoomVisibility } from "@/types";
import { useCreateRoom } from "./room-queries";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

const toIso = (value: string): string | undefined => {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

const FieldGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    {children}
  </div>
);

export const CreateRoomDialog = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const { coords, loading, request } = useGeolocation(false);
  const createRoom = useCreateRoom();
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState<RoomPurpose>(RoomPurpose.CHAT);
  const [customPurpose, setCustomPurpose] = useState("");
  const [radius, setRadius] = useState(5);
  const [maxMembers, setMaxMembers] = useState(50);
  const [visibility, setVisibility] = useState<RoomVisibility>(RoomVisibility.PUBLIC);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [coverPhotoUrl, setCoverPhotoUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const reset = () => {
    setName("");
    setPurpose(RoomPurpose.CHAT);
    setCustomPurpose("");
    setRadius(5);
    setMaxMembers(50);
    setVisibility(RoomVisibility.PUBLIC);
    setDescription("");
    setTags("");
    setCoverPhotoUrl("");
    setStartsAt("");
    setEndsAt("");
    setExpiresAt("");
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
        cover_photo_url: coverPhotoUrl || undefined,
        starts_at: toIso(startsAt),
        ends_at: toIso(endsAt),
        expires_at: toIso(expiresAt),
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      toast({ title: "Room created", description: room.name });
      onOpenChange(false);
      reset();
      navigate(`/rooms/${room.id}`);
    } catch (err) {
      toast({ variant: "destructive", title: "Create failed", description: errorMessage(err) });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o && !coords) request();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Drop a new room</DialogTitle>
          <DialogDescription>
            Rooms are pinned to where you stand. Only people inside the radius can find it.
          </DialogDescription>
        </DialogHeader>

        <button
          type="button"
          onClick={request}
          className={cn(
            "flex items-center justify-between gap-3 rounded-sm border-2 border-ink px-3 py-2.5 text-left transition",
            coords ? "bg-acid/15" : "bg-secondary hover:bg-accent",
          )}
        >
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            <span className="font-mono text-xs">
              {loading
                ? "Locating…"
                : coords
                  ? formatCoord(coords.latitude, coords.longitude)
                  : "Tap to set anchor location"}
            </span>
          </span>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Crosshair className="h-4 w-4" strokeWidth={2.5} />
          )}
        </button>

        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <div className="sm:col-span-2">
            <FieldGroup label="Name">
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                placeholder="Sunset run at the pier"
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Purpose">
            <Select value={purpose} onValueChange={(v) => setPurpose(v as RoomPurpose)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PURPOSE_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>

          <FieldGroup label="Visibility">
            <Select value={visibility} onValueChange={(v) => setVisibility(v as RoomVisibility)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={RoomVisibility.PUBLIC}>Public</SelectItem>
                <SelectItem value={RoomVisibility.PRIVATE}>Private · invite only</SelectItem>
              </SelectContent>
            </Select>
          </FieldGroup>

          {purpose === RoomPurpose.CUSTOM && (
            <div className="sm:col-span-2">
              <FieldGroup label="Custom purpose">
                <Input
                  value={customPurpose}
                  onChange={(e) => setCustomPurpose(e.target.value)}
                  required
                  maxLength={60}
                />
              </FieldGroup>
            </div>
          )}

          <FieldGroup label="Radius (km)">
            <Input
              type="number"
              min={0.1}
              max={200}
              step={0.1}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            />
          </FieldGroup>

          <FieldGroup label="Max members">
            <Input
              type="number"
              min={2}
              max={500}
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
            />
          </FieldGroup>

          <div className="sm:col-span-2">
            <FieldGroup label="Description">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                placeholder="What's the plan?"
              />
            </FieldGroup>
          </div>

          <div className="sm:col-span-2">
            <FieldGroup label="Cover photo URL">
              <Input
                type="url"
                value={coverPhotoUrl}
                onChange={(e) => setCoverPhotoUrl(e.target.value)}
                placeholder="https://…"
                maxLength={500}
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Starts at">
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </FieldGroup>

          <FieldGroup label="Ends at">
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </FieldGroup>

          <div className="sm:col-span-2">
            <FieldGroup label="Auto-expire at (optional)">
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </FieldGroup>
          </div>

          <div className="sm:col-span-2">
            <FieldGroup label="Tags · comma separated">
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="movies, weekend, downtown"
              />
            </FieldGroup>
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="acid" disabled={createRoom.isPending}>
              {createRoom.isPending ? "Dropping…" : "Drop room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
