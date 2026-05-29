import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Compass, Crosshair, Plus, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { RoomMap } from "@/components/map/room-map-lazy";
import { PageHeader } from "@/components/layout/page-header";
import { staggerContainer } from "@/components/shared/motion";
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

const Grid = ({ rooms, gridKey }: { rooms: (RoomSummary | NearbyRoom)[]; gridKey: string }) => (
  <motion.div
    key={gridKey}
    variants={staggerContainer}
    initial="hidden"
    animate="show"
    className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
  >
    {rooms.map((r) => (
      <RoomCard key={r.id} room={r} />
    ))}
  </motion.div>
);

const SkeletonGrid = () => (
  <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
    {Array.from({ length: 10 }).map((_, i) => (
      <RoomCardSkeleton key={i} />
    ))}
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

  const { coords, loading: geoLoading, error: geoError, request } = useGeolocation(false);
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

  const activeQuery = showSearch
    ? searched
    : tab === "nearby"
      ? nearby
      : tab === "joined"
        ? joined
        : tab === "owned"
          ? owned
          : tab === "saved"
            ? saved
            : past;

  const lists: Record<Exclude<Tab, "nearby">, { items?: RoomSummary[]; loading: boolean }> = {
    joined: { items: joined.data?.items, loading: joined.isLoading },
    owned: { items: owned.data?.items, loading: owned.isLoading },
    saved: { items: saved.data?.items, loading: saved.isLoading },
    past: { items: past.data?.items, loading: past.isLoading },
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader>
        <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-sm border-2 border-ink bg-acid text-acid-foreground sm:flex">
          <Compass className="h-5 w-5" strokeWidth={2.5} />
        </span>
        <h1 className="hidden shrink-0 font-display text-xl font-extrabold tracking-tight md:block">
          Discover
        </h1>
        <div className="relative ml-auto w-full max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search rooms…"
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
        <Button
          variant="outline"
          size="icon"
          onClick={() => activeQuery.refetch()}
          aria-label="Refresh"
          title="Refresh"
        >
          <RefreshCw
            className={cn("h-4 w-4", activeQuery.isFetching && "animate-spin")}
            strokeWidth={2.5}
          />
        </Button>
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
        <div className="hidden sm:block">
          <JoinByCodeDialog />
        </div>
        <Button variant="acid" size="icon" className="sm:hidden" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" strokeWidth={3} />
        </Button>
        <Button variant="acid" className="hidden sm:inline-flex" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" strokeWidth={3} /> New Room
        </Button>
      </PageHeader>

      {!showSearch && (
        <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b-2 border-ink bg-card px-4 py-2 no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "relative shrink-0 rounded-sm px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wide transition-colors",
                tab === t.value ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab === t.value && (
                <motion.span
                  layoutId="discover-tab"
                  className="absolute inset-0 -z-0 rounded-sm border-2 border-ink bg-primary"
                  transition={{ type: "spring", stiffness: 520, damping: 36 }}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        {showSearch ? (
          <div className="h-full overflow-y-auto">
            {searched.isLoading ? (
              <SkeletonGrid />
            ) : searched.data && searched.data.items.length > 0 ? (
              <Grid rooms={searched.data.items} gridKey={`search-${debouncedSearch}`} />
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
            <ListTab tab={tab} list={lists[tab]} onCreate={() => setCreateOpen(true)} />
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
  if (!coords) {
    return (
      <div className="grid h-full place-items-center p-4">
        <EmptyState
          icon={<Crosshair className="h-6 w-6" />}
          title={geoLoading ? "Finding you…" : "See who's around"}
          description={
            geoError
              ? "Location was blocked. Allow it in your browser's site permissions, then try again."
              : "HeadTogether pins rooms to real places. Allow location to load the map and nearby rooms."
          }
          action={
            <Button variant="acid" onClick={onRequest} disabled={geoLoading}>
              <Crosshair className="h-4 w-4" strokeWidth={2.5} />
              {geoLoading ? "Locating…" : "Enable location"}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex w-full flex-col md:w-[380px] md:border-r-2 md:border-ink xl:w-[440px]">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {geoLoading || loading ? (
            <div className="space-y-3 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <RoomCardSkeleton key={i} />
              ))}
            </div>
          ) : rooms.length > 0 ? (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-3 p-3"
            >
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  selected={selectedId === room.id}
                  onHover={() => onSelect(room.id)}
                />
              ))}
            </motion.div>
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

const COPY: Record<Exclude<Tab, "nearby">, { title: string; description: string }> = {
  joined: { title: "No rooms joined", description: "Join a nearby room or use an invite code." },
  owned: { title: "No rooms yet", description: "Drop your first room to gather people." },
  saved: { title: "Nothing saved", description: "Bookmark rooms to keep them handy." },
  past: { title: "No past rooms", description: "Archived and ended rooms collect here." },
};

const ListTab = ({
  tab,
  list,
  onCreate,
}: {
  tab: Exclude<Tab, "nearby">;
  list: { items?: RoomSummary[]; loading: boolean };
  onCreate: () => void;
}) => {
  if (list.loading) return <SkeletonGrid />;
  if (!list.items || list.items.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon={<Compass className="h-6 w-6" />}
          title={COPY[tab].title}
          description={COPY[tab].description}
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
  return <Grid rooms={list.items} gridKey={tab} />;
};
