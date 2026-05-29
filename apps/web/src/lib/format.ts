import { formatDistanceToNowStrict, isToday, isYesterday } from "date-fns";

export const relativeTime = (value: string | Date | null | undefined): string => {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNowStrict(date, { addSuffix: true })
    .replace(" seconds", "s")
    .replace(" second", "s")
    .replace(" minutes", "m")
    .replace(" minute", "m")
    .replace(" hours", "h")
    .replace(" hour", "h")
    .replace(" days", "d")
    .replace(" day", "d")
    .replace(" months", "mo")
    .replace(" month", "mo")
    .replace(" years", "y")
    .replace(" year", "y");
};

export const clockTime = (value: string | Date): string => {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const dayLabel = (value: string | Date): string => {
  const date = typeof value === "string" ? new Date(value) : value;
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
};

export const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
};

export const formatCoord = (lat: number, lng: number): string =>
  `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

export const pluralize = (count: number, singular: string, plural?: string): string =>
  `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
