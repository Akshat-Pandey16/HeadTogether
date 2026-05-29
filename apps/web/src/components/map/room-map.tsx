import { useEffect, useMemo, useRef } from "react";
import Map, { Marker, type MapRef } from "react-map-gl/maplibre";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { purposeMeta } from "@/lib/purpose";
import { cn } from "@/lib/utils";
import type { NearbyRoom } from "@/types";

const RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export type RoomMapProps = {
  center: { latitude: number; longitude: number };
  rooms: NearbyRoom[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
  showCenter?: boolean;
  zoom?: number;
};

export const RoomMap = ({
  center,
  rooms,
  selectedId,
  onSelect,
  className,
  showCenter = true,
  zoom = 12,
}: RoomMapProps) => {
  const ref = useRef<MapRef | null>(null);
  const initial = useMemo(
    () => ({ latitude: center.latitude, longitude: center.longitude, zoom }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    const map = ref.current;
    if (!map) return;
    map.easeTo({ center: [center.longitude, center.latitude], duration: 600 });
  }, [center.latitude, center.longitude]);

  useEffect(() => {
    if (!selectedId) return;
    const room = rooms.find((r) => r.id === selectedId);
    if (room && ref.current) {
      ref.current.easeTo({ center: [room.longitude, room.latitude], zoom: 14, duration: 500 });
    }
  }, [selectedId, rooms]);

  return (
    <div className={cn("map-brutal relative h-full w-full", className)}>
      <Map
        ref={ref}
        initialViewState={initial}
        mapStyle={RASTER_STYLE}
        attributionControl={{ compact: true }}
        dragRotate={false}
        style={{ width: "100%", height: "100%" }}
      >
        {showCenter && (
          <Marker latitude={center.latitude} longitude={center.longitude} anchor="center">
            <div className="relative flex items-center justify-center">
              <span
                className="absolute h-10 w-10 rounded-full border-2 border-acid"
                style={{ animation: "ping-ring 2.4s ease-out infinite" }}
              />
              <span className="h-3.5 w-3.5 rounded-full border-2 border-ink bg-acid" />
            </div>
          </Marker>
        )}

        {rooms.map((room) => {
          const meta = purposeMeta(room.purpose);
          const Icon = meta.icon;
          const active = room.id === selectedId;
          return (
            <Marker
              key={room.id}
              latitude={room.latitude}
              longitude={room.longitude}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onSelect?.(room.id);
              }}
            >
              <button
                type="button"
                className={cn(
                  "flex flex-col items-center transition-transform",
                  active ? "z-10 scale-110" : "hover:scale-105",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-sm border-2 border-ink text-black shadow-brutal-sm",
                    active && "ring-2 ring-acid ring-offset-1",
                  )}
                  style={{ backgroundColor: meta.color }}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.5} />
                </span>
                <span className="-mt-0.5 h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-ink" />
              </button>
            </Marker>
          );
        })}
      </Map>
    </div>
  );
};
