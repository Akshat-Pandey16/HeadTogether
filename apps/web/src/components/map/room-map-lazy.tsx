import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { RoomMapProps } from "./room-map";

const RoomMapImpl = lazy(() =>
  import("./room-map").then((m) => ({ default: m.RoomMap })),
);

export const RoomMap = (props: RoomMapProps) => (
  <Suspense
    fallback={
      <div className="grid h-full w-full place-items-center bg-secondary">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    }
  >
    <RoomMapImpl {...props} />
  </Suspense>
);
