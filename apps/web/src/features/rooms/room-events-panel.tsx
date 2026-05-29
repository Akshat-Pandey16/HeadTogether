import { History } from "lucide-react";
import { relativeTime } from "@/lib/format";
import { useRoomEvents } from "./room-queries";
import { RoomEventType, type RoomEvent } from "@/types";

type Props = { roomId: string };

const describe = (e: RoomEvent): string => {
  switch (e.event_type) {
    case RoomEventType.CREATED:
      return "Room created";
    case RoomEventType.UPDATED:
      return "Room details updated";
    case RoomEventType.ARCHIVED:
      return "Room archived";
    case RoomEventType.REACTIVATED:
      return "Room reactivated";
    case RoomEventType.DELETED:
      return "Room deleted";
    case RoomEventType.RESTORED:
      return "Room restored";
    case RoomEventType.OWNERSHIP_TRANSFERRED:
      return "Ownership transferred";
    case RoomEventType.MEMBER_JOINED:
      return "Member joined";
    case RoomEventType.MEMBER_LEFT:
      return "Member left";
    case RoomEventType.MEMBER_KICKED:
      return "Member removed";
    case RoomEventType.MEMBER_PROMOTED:
      return "Member promoted";
    case RoomEventType.MEMBER_DEMOTED:
      return "Member demoted";
    case RoomEventType.WAITLIST_JOINED:
      return "Joined waitlist";
    case RoomEventType.WAITLIST_PROMOTED:
      return "Promoted from waitlist";
    default:
      return e.event_type;
  }
};

export const RoomEventsPanel = ({ roomId }: Props) => {
  const events = useRoomEvents(roomId);

  if (events.isLoading) {
    return <p className="font-mono text-xs text-muted-foreground">Loading activity…</p>;
  }
  if (!events.data || events.data.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-sm border-2 border-dashed border-border p-8 text-center">
        <History className="h-5 w-5 text-muted-foreground" />
        <p className="font-mono text-xs text-muted-foreground">No activity yet.</p>
      </div>
    );
  }

  return (
    <ul className="relative space-y-0 border-l-2 border-ink pl-4">
      {events.data.items.map((e) => (
        <li key={e.id} className="relative py-2.5">
          <span className="absolute -left-[1.32rem] top-3.5 h-2.5 w-2.5 rounded-sm border-2 border-ink bg-acid" />
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold">{describe(e)}</span>
            <span className="shrink-0 font-mono text-[10px] uppercase text-muted-foreground">
              {relativeTime(e.created_at)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
};
