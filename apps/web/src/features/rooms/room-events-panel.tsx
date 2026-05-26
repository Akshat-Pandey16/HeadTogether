import { formatDistanceToNow } from "date-fns";
import { History } from "lucide-react";
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
    return <p className="text-sm text-muted-foreground">Loading activity…</p>;
  }
  if (!events.data || events.data.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
        <History className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {events.data.items.map((e) => (
        <li
          key={e.id}
          className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
        >
          <span>{describe(e)}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
          </span>
        </li>
      ))}
    </ul>
  );
};
