import { Link } from "react-router-dom";
import { Bookmark, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";
import type { NearbyRoom, RoomSummary } from "@/types";

type Props = { room: RoomSummary | NearbyRoom };

const purposeLabel = (p: string, custom?: string | null) =>
  p === "custom" && custom ? custom : p.charAt(0).toUpperCase() + p.slice(1);

export const RoomCard = ({ room }: Props) => {
  const distance = "distance_km" in room ? room.distance_km : null;
  return (
    <Link to={`/rooms/${room.id}`} className="block group">
      <Card className="transition group-hover:border-foreground/30 group-hover:shadow-md">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{room.name}</p>
              <p className="text-xs text-muted-foreground">
                {purposeLabel(room.purpose, room.custom_purpose)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {room.is_saved && <Bookmark className="h-4 w-4 fill-current text-foreground" />}
              {room.is_owner && <Badge variant="secondary">Owner</Badge>}
            </div>
          </div>
          {room.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{room.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {room.member_count} / {room.max_members}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {distance !== null ? `${distance.toFixed(1)} km` : `${room.radius_km} km radius`}
            </span>
            <span className="inline-flex items-center gap-2">
              <UserAvatar user={room.owner} className="h-5 w-5" />
              <span className="truncate">
                {room.owner.first_name} {room.owner.last_name}
              </span>
            </span>
          </div>
          {room.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {room.tags.slice(0, 4).map((t) => (
                <Badge key={t.id} variant="outline" className={cn("text-[10px]")}>
                  {t.label}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

export const RoomCardSkeleton = () => (
  <Card>
    <CardContent className="space-y-3 p-5">
      <div className="h-4 w-1/2 rounded bg-muted" />
      <div className="h-3 w-3/4 rounded bg-muted" />
      <div className="h-3 w-1/3 rounded bg-muted" />
    </CardContent>
  </Card>
);
