import { Link } from "react-router-dom";
import { Bookmark, Navigation, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { formatDistance } from "@/lib/format";
import { purposeMeta } from "@/lib/purpose";
import { cn } from "@/lib/utils";
import type { NearbyRoom, RoomSummary } from "@/types";

type Props = { room: RoomSummary | NearbyRoom };

export const RoomCard = ({ room }: Props) => {
  const distance = "distance_km" in room ? room.distance_km : null;
  const meta = purposeMeta(room.purpose);
  const Icon = meta.icon;
  const full = room.member_count >= room.max_members;

  return (
    <Link
      to={`/rooms/${room.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-sm border-2 border-ink bg-card transition-[transform,box-shadow] duration-100 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg"
    >
      <div className="relative h-24 shrink-0 overflow-hidden border-b-2 border-ink">
        {room.cover_photo_url ? (
          <img
            src={room.cover_photo_url}
            alt={room.name}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div
            className="grain h-full w-full"
            style={{ backgroundColor: meta.color, opacity: 0.9 }}
          />
        )}
        <span
          className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-sm border-2 border-ink px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-black"
          style={{ backgroundColor: meta.color }}
        >
          <Icon className="h-3 w-3" strokeWidth={2.5} />
          {room.purpose === "custom" && room.custom_purpose ? room.custom_purpose : meta.label}
        </span>
        <div className="absolute right-2 top-2 flex items-center gap-1">
          {room.is_saved && (
            <span className="flex h-6 w-6 items-center justify-center rounded-sm border-2 border-ink bg-card">
              <Bookmark className="h-3 w-3 fill-current" strokeWidth={2.5} />
            </span>
          )}
          {distance !== null && (
            <span className="inline-flex items-center gap-1 rounded-sm border-2 border-ink bg-card px-1.5 py-0.5 font-mono text-[10px] font-bold">
              <Navigation className="h-3 w-3" strokeWidth={2.5} />
              {formatDistance(distance)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-display text-base font-bold leading-tight">
            {room.name}
          </h3>
          {room.is_owner && <Badge variant="acid">Owner</Badge>}
          {!room.is_owner && room.role === "moderator" && <Badge>Mod</Badge>}
        </div>

        {room.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{room.description}</p>
        )}

        {room.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {room.tags.slice(0, 3).map((t) => (
              <Badge key={t.id} variant="outline">
                {t.label}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t-2 border-dashed border-border pt-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <UserAvatar user={room.owner} className="h-5 w-5" />
            <span className="truncate font-mono text-[11px] text-muted-foreground">
              {room.owner.first_name}
            </span>
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 font-mono text-[11px] font-bold",
              full ? "text-destructive" : "text-foreground",
            )}
          >
            <Users className="h-3.5 w-3.5" strokeWidth={2.5} />
            {room.member_count}/{room.max_members}
          </span>
        </div>
      </div>
    </Link>
  );
};

export const RoomCardSkeleton = () => (
  <div className="flex h-full flex-col overflow-hidden rounded-sm border-2 border-border bg-card">
    <div className="h-24 animate-pulse border-b-2 border-border bg-muted" />
    <div className="flex flex-1 flex-col gap-2 p-3">
      <div className="h-4 w-2/3 animate-pulse rounded-sm bg-muted" />
      <div className="h-3 w-full animate-pulse rounded-sm bg-muted" />
      <div className="mt-auto h-3 w-1/2 animate-pulse rounded-sm bg-muted" />
    </div>
  </div>
);
