import { Clapperboard, Gamepad2, Landmark, MessageCircle, Plane, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { RoomPurpose } from "@/types";

type PurposeMeta = {
  label: string;
  icon: LucideIcon;
  color: string;
  className: string;
};

export const PURPOSE_META: Record<RoomPurpose, PurposeMeta> = {
  [RoomPurpose.PLAY]: {
    label: "Play",
    icon: Gamepad2,
    color: "var(--color-play)",
    className: "bg-play text-black",
  },
  [RoomPurpose.MOVIE]: {
    label: "Movie",
    icon: Clapperboard,
    color: "var(--color-movie)",
    className: "bg-movie text-black",
  },
  [RoomPurpose.TRAVEL]: {
    label: "Travel",
    icon: Plane,
    color: "var(--color-travel)",
    className: "bg-travel text-black",
  },
  [RoomPurpose.CHAT]: {
    label: "Chat",
    icon: MessageCircle,
    color: "var(--color-chat)",
    className: "bg-chat text-black",
  },
  [RoomPurpose.LANDMARK]: {
    label: "Landmark",
    icon: Landmark,
    color: "var(--color-landmark)",
    className: "bg-landmark text-black",
  },
  [RoomPurpose.CUSTOM]: {
    label: "Custom",
    icon: Sparkles,
    color: "var(--color-custom)",
    className: "bg-custom text-black",
  },
};

export const purposeMeta = (purpose: RoomPurpose) => PURPOSE_META[purpose] ?? PURPOSE_META.custom;

export const PURPOSE_OPTIONS = Object.entries(PURPOSE_META).map(([value, meta]) => ({
  value: value as RoomPurpose,
  label: meta.label,
  icon: meta.icon,
}));
