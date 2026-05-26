import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounce } from "@/hooks/use-debounce";
import { useGeolocation } from "@/hooks/use-geolocation";
import { CreateRoomDialog } from "./create-room-dialog";
import { RoomCard, RoomCardSkeleton } from "./room-card";
import {
  useJoinedRooms,
  useNearbyRooms,
  useOwnedRooms,
  useSavedRooms,
  useSearchRooms,
} from "./room-queries";

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

export const RoomsListPage = () => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const { coords, loading: geoLoading, error: geoError, request } = useGeolocation(true);

  const joined = useJoinedRooms();
  const owned = useOwnedRooms();
  const saved = useSavedRooms();
  const nearby = useNearbyRooms({
    latitude: coords?.latitude,
    longitude: coords?.longitude,
    sort: "distance",
  });
  const searched = useSearchRooms(debouncedSearch);

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
        <CreateRoomDialog />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search rooms by name, description, or tag"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
        </Tabs>
      )}
    </div>
  );
};
