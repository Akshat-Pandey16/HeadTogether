import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { roomsApi } from "@/lib/api";
import type {
  MembershipState,
  NearbySort,
  RoomCreatePayload,
  RoomPurpose,
  RoomUpdatePayload,
  TextSort,
} from "@/types";

export const roomKeys = {
  all: ["rooms"] as const,
  joined: (params?: { include_archived?: boolean }) => ["rooms", "joined", params] as const,
  owned: () => ["rooms", "owned"] as const,
  saved: () => ["rooms", "saved"] as const,
  past: () => ["rooms", "past"] as const,
  search: (q: string, purpose?: RoomPurpose, sort?: TextSort) =>
    ["rooms", "search", { q, purpose, sort }] as const,
  nearby: (lat?: number, lng?: number, purpose?: RoomPurpose, sort?: NearbySort, max?: number) =>
    ["rooms", "nearby", { lat, lng, purpose, sort, max }] as const,
  detail: (roomId: string) => ["rooms", "detail", roomId] as const,
  members: (roomId: string, state?: MembershipState) =>
    ["rooms", roomId, "members", state] as const,
  events: (roomId: string) => ["rooms", roomId, "events"] as const,
};

export const useJoinedRooms = (include_archived = false) =>
  useQuery({
    queryKey: roomKeys.joined({ include_archived }),
    queryFn: () => roomsApi.listJoined({ include_archived }),
    refetchOnWindowFocus: true,
  });

export const useOwnedRooms = () =>
  useQuery({
    queryKey: roomKeys.owned(),
    queryFn: () => roomsApi.listOwned(),
    refetchOnWindowFocus: true,
  });

export const useSavedRooms = () =>
  useQuery({
    queryKey: roomKeys.saved(),
    queryFn: () => roomsApi.listSaved(),
    refetchOnWindowFocus: true,
  });

export const usePastRooms = () =>
  useQuery({
    queryKey: roomKeys.past(),
    queryFn: () => roomsApi.listPast(),
    refetchOnWindowFocus: true,
  });

export const useSearchRooms = (q: string, purpose?: RoomPurpose, sort?: TextSort) =>
  useQuery({
    queryKey: roomKeys.search(q, purpose, sort),
    queryFn: () => roomsApi.search({ q, purpose, sort }),
    enabled: q.trim().length > 0,
  });

type NearbyArgs = {
  latitude?: number;
  longitude?: number;
  purpose?: RoomPurpose;
  sort?: NearbySort;
  max_distance_km?: number;
};

export const useNearbyRooms = (args: NearbyArgs) =>
  useQuery({
    queryKey: roomKeys.nearby(
      args.latitude,
      args.longitude,
      args.purpose,
      args.sort,
      args.max_distance_km,
    ),
    queryFn: () =>
      roomsApi.nearby({
        latitude: args.latitude!,
        longitude: args.longitude!,
        purpose: args.purpose,
        sort: args.sort,
        max_distance_km: args.max_distance_km,
      }),
    enabled: args.latitude !== undefined && args.longitude !== undefined,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

export const useRoom = (roomId: string | undefined) =>
  useQuery({
    queryKey: roomKeys.detail(roomId ?? ""),
    queryFn: () => roomsApi.get(roomId!),
    enabled: Boolean(roomId),
    refetchOnWindowFocus: true,
  });

export const useRoomMembers = (roomId: string, state?: MembershipState) =>
  useQuery({
    queryKey: roomKeys.members(roomId, state),
    queryFn: () => roomsApi.listMembers(roomId, { state }),
    refetchOnWindowFocus: true,
  });

export const useRoomEvents = (roomId: string) =>
  useQuery({ queryKey: roomKeys.events(roomId), queryFn: () => roomsApi.events(roomId) });

const invalidateRoomLists = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: roomKeys.all });
};

export const useCreateRoom = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RoomCreatePayload) => roomsApi.create(payload),
    onSuccess: () => invalidateRoomLists(qc),
  });
};

export const useUpdateRoom = (roomId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RoomUpdatePayload) => roomsApi.update(roomId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roomKeys.detail(roomId) });
      invalidateRoomLists(qc);
    },
  });
};

export const useJoinRoom = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      roomId,
      latitude,
      longitude,
    }: {
      roomId: string;
      latitude: number;
      longitude: number;
    }) => roomsApi.join(roomId, { latitude, longitude }),
    onSuccess: (_, { roomId }) => {
      qc.invalidateQueries({ queryKey: roomKeys.detail(roomId) });
      invalidateRoomLists(qc);
    },
  });
};

export const useLeaveRoom = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => roomsApi.leave(roomId),
    onSuccess: (_, roomId) => {
      qc.invalidateQueries({ queryKey: roomKeys.detail(roomId) });
      invalidateRoomLists(qc);
    },
  });
};

export const useSaveRoom = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ roomId, save }: { roomId: string; save: boolean }) => {
      if (save) await roomsApi.save(roomId);
      else await roomsApi.unsave(roomId);
    },
    onSuccess: (_, { roomId }) => {
      qc.invalidateQueries({ queryKey: roomKeys.detail(roomId) });
      invalidateRoomLists(qc);
    },
  });
};

export const useDeleteRoom = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => roomsApi.remove(roomId),
    onSuccess: () => invalidateRoomLists(qc),
  });
};

export const useArchiveRoom = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => roomsApi.archive(roomId),
    onSuccess: (_, roomId) => {
      qc.invalidateQueries({ queryKey: roomKeys.detail(roomId) });
      invalidateRoomLists(qc);
    },
  });
};

export const useKickMember = (roomId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => roomsApi.kick(roomId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roomKeys.members(roomId) });
      qc.invalidateQueries({ queryKey: roomKeys.detail(roomId) });
    },
  });
};

export const usePromoteMember = (roomId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => roomsApi.promote(roomId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: roomKeys.members(roomId) }),
  });
};

export const useDemoteMember = (roomId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => roomsApi.demote(roomId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: roomKeys.members(roomId) }),
  });
};

export const useJoinByCode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invite_code: string) => roomsApi.joinByCode(invite_code),
    onSuccess: () => invalidateRoomLists(qc),
  });
};

export const useReactivateRoom = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => roomsApi.reactivate(roomId),
    onSuccess: (_, roomId) => {
      qc.invalidateQueries({ queryKey: roomKeys.detail(roomId) });
      invalidateRoomLists(qc);
    },
  });
};

export const useRestoreRoom = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => roomsApi.restore(roomId),
    onSuccess: (_, roomId) => {
      qc.invalidateQueries({ queryKey: roomKeys.detail(roomId) });
      invalidateRoomLists(qc);
    },
  });
};

export const useTransferOwnership = (roomId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (new_owner_id: string) => roomsApi.transfer(roomId, new_owner_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roomKeys.detail(roomId) });
      invalidateRoomLists(qc);
    },
  });
};

export const useRotateInviteCode = (roomId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => roomsApi.rotateInvite(roomId),
    onSuccess: () => qc.invalidateQueries({ queryKey: roomKeys.detail(roomId) }),
  });
};

export const useAddRoomDetail = (roomId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { heading: string; body: string }) =>
      roomsApi.addDetail(roomId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: roomKeys.detail(roomId) }),
  });
};

export const useUpdateRoomDetail = (roomId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      detailId,
      payload,
    }: {
      detailId: string;
      payload: Partial<{ heading: string; body: string }>;
    }) => roomsApi.updateDetail(roomId, detailId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: roomKeys.detail(roomId) }),
  });
};

export const useDeleteRoomDetail = (roomId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (detailId: string) => roomsApi.deleteDetail(roomId, detailId),
    onSuccess: () => qc.invalidateQueries({ queryKey: roomKeys.detail(roomId) }),
  });
};
