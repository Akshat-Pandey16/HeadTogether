import { useState } from "react";
import { Filter, Search, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounce } from "@/hooks/use-debounce";
import { useGeolocation } from "@/hooks/use-geolocation";
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
import { RoomPurpose, type NearbySort } from "@/types";

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
);

const Skeletons = () => (
  <Grid>
    {Array.from({ length: 6 }).map((_, i) => (
      <RoomCardSkeleton key={i} />
    ))}
  </Grid>
);

const purposeOptions: { value: RoomPurpose | "any"; label: string }[] = [
  { value: "any", label: "Any purpose" },
  { value: RoomPurpose.PLAY, label: "Play" },
  { value: RoomPurpose.MOVIE, label: "Movie" },
  { value: RoomPurpose.TRAVEL, label: "Travel" },
  { value: RoomPurpose.CHAT, label: "Chat" },
  { value: RoomPurpose.LANDMARK, label: "Landmark" },
  { value: RoomPurpose.CUSTOM, label: "Custom" },
];

const sortOptions: { value: NearbySort; label: string }[] = [
  { value: "distance", label: "Closest first" },
  { value: "newest", label: "Newest first" },
  { value: "members", label: "Most members" },
  { value: "starts_at", label: "Starting soon" },
];

export const RoomsListPage = () => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const { coords, loading: geoLoading, error: geoError, request } = useGeolocation(true);

  const [purposeFilter, setPurposeFilter] = useState<RoomPurpose | "any">("any");
  const [sort, setSort] = useState<NearbySort>("distance");
  const [maxDistance, setMaxDistance] = useState<number>(50);

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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rooms</h1>
          <p className="text-sm text-muted-foreground">
            Find people doing things nearby or join a room you saved.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <JoinByCodeDialog />
          <CreateRoomDialog />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search rooms by name, description, or tag"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4" /> Filters
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-3 p-4" align="end">
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Select
                value={purposeFilter}
                onValueChange={(v) => setPurposeFilter(v as RoomPurpose | "any")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {purposeOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sort (nearby)</Label>
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
            <div className="space-y-2">
              <Label htmlFor="max_dist">Max distance (km)</Label>
              <Input
                id="max_dist"
                type="number"
                min={1}
                max={500}
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value) || 1)}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {showSearch ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Search results for "{debouncedSearch}"
          </h2>
          {searched.isLoading ? (
            <Skeletons />
          ) : searched.data && searched.data.items.length > 0 ? (
            <Grid>
              {searched.data.items.map((r) => (
                <RoomCard key={r.id} room={r} />
              ))}
            </Grid>
          ) : (
            <EmptyState title="No matching rooms" />
          )}
        </section>
      ) : (
        <Tabs defaultValue="nearby">
          <TabsList>
            <TabsTrigger value="nearby">Nearby</TabsTrigger>
            <TabsTrigger value="joined">Joined</TabsTrigger>
            <TabsTrigger value="owned">Owned</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>

          <TabsContent value="nearby">
            {geoError ? (
              <EmptyState
                icon={<Sparkles className="h-5 w-5" />}
                title="Location blocked"
                description="Enable location access to discover rooms near you."
                action={
                  <button
                    onClick={request}
                    className="text-sm font-medium text-foreground underline"
                  >
                    Try again
                  </button>
                }
              />
            ) : geoLoading || nearby.isLoading ? (
              <Skeletons />
            ) : nearby.data && nearby.data.items.length > 0 ? (
              <Grid>
                {nearby.data.items.map((r) => (
                  <RoomCard key={r.id} room={r} />
                ))}
              </Grid>
            ) : (
              <EmptyState
                title="Nothing nearby yet"
                description="Be the first to start a room in your area."
                action={<CreateRoomDialog />}
              />
            )}
          </TabsContent>

          <TabsContent value="joined">
            {joined.isLoading ? (
              <Skeletons />
            ) : joined.data && joined.data.items.length > 0 ? (
              <Grid>
                {joined.data.items.map((r) => (
                  <RoomCard key={r.id} room={r} />
                ))}
              </Grid>
            ) : (
              <EmptyState
                title="No joined rooms"
                description="Find a nearby room or paste an invite code."
              />
            )}
          </TabsContent>

          <TabsContent value="owned">
            {owned.isLoading ? (
              <Skeletons />
            ) : owned.data && owned.data.items.length > 0 ? (
              <Grid>
                {owned.data.items.map((r) => (
                  <RoomCard key={r.id} room={r} />
                ))}
              </Grid>
            ) : (
              <EmptyState title="You haven't created any rooms yet" />
            )}
          </TabsContent>

          <TabsContent value="saved">
            {saved.isLoading ? (
              <Skeletons />
            ) : saved.data && saved.data.items.length > 0 ? (
              <Grid>
                {saved.data.items.map((r) => (
                  <RoomCard key={r.id} room={r} />
                ))}
              </Grid>
            ) : (
              <EmptyState title="No saved rooms" description="Bookmark rooms to find them later." />
            )}
          </TabsContent>

          <TabsContent value="past">
            {past.isLoading ? (
              <Skeletons />
            ) : past.data && past.data.items.length > 0 ? (
              <Grid>
                {past.data.items.map((r) => (
                  <RoomCard key={r.id} room={r} />
                ))}
              </Grid>
            ) : (
              <EmptyState
                title="No past rooms"
                description="Archived or expired rooms will appear here."
              />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
