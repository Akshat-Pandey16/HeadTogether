import { useCallback, useEffect, useState } from "react";

type Coords = { latitude: number; longitude: number };

type GeolocationState = {
  coords: Coords | null;
  error: string | null;
  loading: boolean;
};

let cachedCoords: Coords | null = null;

export const useGeolocation = (auto = true): GeolocationState & { request: () => void } => {
  const [state, setState] = useState<GeolocationState>({
    coords: cachedCoords,
    error: null,
    loading: false,
  });

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({ coords: null, error: "geolocation_unsupported", loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cachedCoords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setState({ coords: cachedCoords, error: null, loading: false });
      },
      (err) => setState({ coords: null, error: err.message || "geolocation_error", loading: false }),
      { enableHighAccuracy: true, maximumAge: 300_000, timeout: 12_000 },
    );
  }, []);

  useEffect(() => {
    if (cachedCoords) return;
    let cancelled = false;
    const init = async () => {
      if (!("geolocation" in navigator)) return;
      const perms = navigator.permissions;
      if (perms?.query) {
        try {
          const status = await perms.query({ name: "geolocation" as PermissionName });
          if (cancelled) return;
          if (status.state === "granted" || (auto && status.state === "prompt")) {
            request();
            return;
          }
          return;
        } catch {
          if (auto) request();
          return;
        }
      }
      if (auto) request();
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [auto, request]);

  return { ...state, request };
};
