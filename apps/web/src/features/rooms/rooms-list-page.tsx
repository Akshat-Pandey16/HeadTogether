import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, Crosshair, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { RoomMap } from "@/components/map/room-map-lazy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { useGeolocation } from "@/hooks/use-geolocation";
import { formatDistance } from "@/lib/format";
import { PURPOSE_OPTIONS } from "@/lib/purpose";
import { cn } from "@/lib/utils";
import { RoomPurpose, type NearbyRoom, type NearbySort, type RoomSummary } from "@/types";
import { CreateRoomDialog } from "./create-room-dialog";
import { JoinByCodeDialog } from "./join-by-code-dialog";
import { RoomCard, RoomCardSkeleton } from "./room-card";
import {
  useJoinedRooms,
  useNearbyRooms,
  useOwnedRooms,
  usePastRooms,
  useSavedRooms,
  useSearchRooms,
} from "./room-queries";

type Tab = "nearby" | "joined" | "owned" | "saved" | "past";

const TABS: { value: Tab; label: string }[] = [
  { value: "nearby", label: "Nearby" },
  { value: "joined", label: "Joined" },
  { value: "owned", label: "Owned" },
  { value: "saved", label: "Saved" },
  { value: "past", label: "Past" },
];

const sortOptions: { value: NearbySort; label: string }[] = [
  { value: "distance", label: "Closest" },
  { value: "newest", label: "Newest" },
  { value: "members", label: "Busiest" },
  { value: "starts_at", label: "Soonest" },
];

const GridShell = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
    {children}
  </div>
);

export const RoomsListPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("nearby");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [purposeFilter, setPurposeFilter] = useState<RoomPurpose | "any">("any");
  const [sort, setSort] = useState<NearbySort>("distance");
  const [maxDistance, setMaxDistance] = useState(50);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { coords, loading: geoLoading, error: geoError, request } = useGeolocation(true);
  const purpose = purposeFilter === "any" ? undefined : purposeFilter;

  const joined = useJoinedRooms();
  const owned = useOwnedRooms();
  const saved = useSavedRooms();
  const past = usePastRooms();
  const nearby = useNearbyRooms({
    latitude: coords?.latitude,
    longitude: coords?.longitude,
    sort,
    purpose,
    max_distance_km: maxDistance,
  });
  const searched = useSearchRooms(debouncedSearch, purpose);
  const showSearch = debouncedSearch.trim().length > 0;

  const nearbyRooms = useMemo(() => nearby.data?.items ?? [], [nearby.data]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-col gap-3 border-b-2 border-ink bg-card px-4 py-3 lg:flex-row lg:items-center lg:gap-4 lg:py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-sm border-2 border-ink bg-acid text-acid-foreground">
            <Compass className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <div className="leading-none">
            <h1 className="font-display text-2xl font-extrabold tracking-tight">Discover</h1>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {coords
                ? `${nearbyRooms.length} live within ${maxDistance}km`
                : "rooms anchored to real places"}
            </p>
          </div>
        </div>

        <div className="relative flex-1 lg:max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search rooms by name, description, tag…"
            className="pl-9 pr-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Filters">
                <SlidersHorizontal className="h-4 w-4" strokeWidth={2.5} />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-3">
              <div className="space-y-1.5">
                <Label>Purpose</Label>
                <Select
                  value={purposeFilter}
                  onValueChange={(v) => setPurposeFilter(v as RoomPurpose | "any")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any purpose</SelectItem>
                    {PURPOSE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sort nearby</Label>
                <Select value={sort} onValueChange={(v) => setSort(v as NearbySort)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Max distance · {maxDistance}km</Label>
                <input
                  type="range"
                  min={1}
                  max={200}
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                  className="w-full accent-[hsl(var(--acid))]"
                />
              </div>
            </PopoverContent>
          </Popover>
          <JoinByCodeDialog />
          <Button variant="acid" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" strokeWidth={3} />
            <span className="hidden sm:inline">New Room</span>
          </Button>
        </div>
      </header>

      {!showSearch && (
        <div className="flex items-center gap-1.5 overflow-x-auto border-b-2 border-ink bg-card px-4 py-2 no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "shrink-0 rounded-sm border-2 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wide transition",
                tab === t.value
                  ? "border-ink bg-primary text-primary-foreground"
                  : "border-transparent text-muted-foreground hover:border-ink hover:bg-secondary",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        {showSearch ? (
          <div className="h-full overflow-y-auto">
            {searched.isLoading ? (
              <GridShell>
                {Array.from({ length: 8 }).map((_, i) => (
                  <RoomCardSkeleton key={i} />
                ))}
              </GridShell>
            ) : searched.data && searched.data.items.length > 0 ? (
              <GridShell>
                {searched.data.items.map((r) => (
                  <RoomCard key={r.id} room={r} />
                ))}
              </GridShell>
            ) : (
              <div className="p-4">
                <EmptyState
                  icon={<Search className="h-6 w-6" />}
                  title={`No rooms match "${debouncedSearch}"`}
                  description="Try a different term or drop your own room."
                />
              </div>
            )}
          </div>
        ) : tab === "nearby" ? (
          <NearbyView
            coords={coords}
            geoError={geoError}
            geoLoading={geoLoading}
            loading={nearby.isLoading}
            rooms={nearbyRooms}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRequest={request}
            onCreate={() => setCreateOpen(true)}
            onOpen={(id) => navigate(`/rooms/${id}`)}
          />
        ) : (
          <div className="h-full overflow-y-auto">
            <ListTab
              tab={tab}
              joined={joined.data?.items}
              owned={owned.data?.items}
              saved={saved.data?.items}
              past={past.data?.items}
              loading={
                (tab === "joined" && joined.isLoading) ||
                (tab === "owned" && owned.isLoading) ||
                (tab === "saved" && saved.isLoading) ||
                (tab === "past" && past.isLoading)
              }
              onCreate={() => setCreateOpen(true)}
            />
          </div>
        )}
      </div>

      <CreateRoomDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};

type NearbyViewProps = {
  coords: { latitude: number; longitude: number } | null;
  geoError: string | null;
  geoLoading: boolean;
  loading: boolean;
  rooms: NearbyRoom[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRequest: () => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
};

const NearbyView = ({
  coords,
  geoError,
  geoLoading,
  loading,
  rooms,
  selectedId,
  onSelect,
  onRequest,
  onCreate,
  onOpen,
}: NearbyViewProps) => {
  if (geoError && !coords) {
    return (
      <div className="grid h-full place-items-center p-4">
        <EmptyState
          icon={<Crosshair className="h-6 w-6" />}
          title="Location is off"
          description="HeadTogether finds rooms around you. Turn on location to see the map."
          action={
            <Button variant="acid" onClick={onRequest}>
              <Crosshair className="h-4 w-4" strokeWidth={2.5} /> Enable location
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex w-full flex-col border-r-2 border-ink md:w-[380px] xl:w-[440px]">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {geoLoading || loading ? (
            <div className="space-y-3 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <RoomCardSkeleton key={i} />
              ))}
            </div>
          ) : rooms.length > 0 ? (
            <div className="space-y-3 p-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  onMouseEnter={() => onSelect(room.id)}
                  className={cn(
                    "rounded-sm transition",
                    selectedId === room.id && "ring-2 ring-acid ring-offset-2 ring-offset-background",
                  )}
                >
                  <RoomCard room={room} />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3">
              <EmptyState
                icon={<Compass className="h-6 w-6" />}
                title="Nothing nearby yet"
                description="Be the first to drop a room in your area."
                action={
                  <Button variant="acid" onClick={onCreate}>
                    <Plus className="h-4 w-4" strokeWidth={3} /> Drop a room
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </div>

      <div className="relative hidden flex-1 md:block">
        {coords ? (
          <RoomMap
            center={coords}
            rooms={rooms}
            selectedId={selectedId}
            onSelect={(id) => {
              onSelect(id);
              onOpen(id);
            }}
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <span className="font-mono text-xs">acquiring signal…</span>
          </div>
        )}
        {coords && rooms.length > 0 && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-sm border-2 border-ink bg-card px-2.5 py-1.5 font-mono text-[11px] font-bold shadow-brutal-sm">
            {rooms.length} rooms · closest {formatDistance(rooms[0].distance_km)}
          </div>
        )}
      </div>
    </div>
  );
};

type ListTabProps = {
  tab: Tab;
  joined?: RoomSummary[];
  owned?: RoomSummary[];
  saved?: RoomSummary[];
  past?: RoomSummary[];
  loading: boolean;
  onCreate: () => void;
};

const ListTab = ({ tab, joined, owned, saved, past, loading, onCreate }: ListTabProps) => {
  const data = tab === "joined" ? joined : tab === "owned" ? owned : tab === "saved" ? saved : past;
  if (loading) {
    return (
      <GridShell>
        {Array.from({ length: 8 }).map((_, i) => (
          <RoomCardSkeleton key={i} />
        ))}
      </GridShell>
    );
  }
  if (!data || data.length === 0) {
    const copy: Record<Tab, { title: string; description: string }> = {
      nearby: { title: "Nothing nearby", description: "" },
      joined: { title: "No rooms joined", description: "Join a nearby room or use an invite code." },
      owned: { title: "No rooms yet", description: "Drop your first room to gather people." },
      saved: { title: "Nothing saved", description: "Bookmark rooms to keep them handy." },
      past: { title: "No past rooms", description: "Archived and ended rooms collect here." },
    };
    return (
      <div className="p-4">
        <EmptyState
          icon={<Compass className="h-6 w-6" />}
          title={copy[tab].title}
          description={copy[tab].description}
          action={
            tab === "owned" ? (
              <Button variant="acid" onClick={onCreate}>
                <Plus className="h-4 w-4" strokeWidth={3} /> Drop a room
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }
  return (
    <GridShell>
      {data.map((r) => (
        <RoomCard key={r.id} room={r} />
      ))}
    </GridShell>
  );
};
