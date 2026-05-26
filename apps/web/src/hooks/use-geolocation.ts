import { useCallback, useEffect, useState } from "react";

type Coords = { latitude: number; longitude: number };

type GeolocationState = {
  coords: Coords | null;
  error: string | null;
  loading: boolean;
};

export const useGeolocation = (auto = true): GeolocationState & { request: () => void } => {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    error: null,
    loading: auto,
  });

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({ coords: null, error: "geolocation_unsupported", loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setState({
          coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
          error: null,
          loading: false,
        }),
      (err) => setState({ coords: null, error: err.message || "geolocation_error", loading: false }),
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 },
    );
  }, []);

  useEffect(() => {
    if (auto) request();
  }, [auto, request]);

  return { ...state, request };
};
