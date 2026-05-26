import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Flag, MessageCircle, Shield, UserMinus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingPage } from "@/components/shared/loading";
import { UserAvatar } from "@/components/shared/user-avatar";
import { toast } from "@/components/ui/toaster";
import { dmsApi, moderationApi, usersApi } from "@/lib/api";
import { errorMessage } from "@/lib/api-error";
import { useAuth } from "@/providers/auth-provider";
import { ReportReason, ReportTarget } from "@/types";

export const ProfilePage = () => {
  const { userId = "" } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const qc = useQueryClient();

  const profile = useQuery({
    queryKey: ["users", userId],
    queryFn: () => usersApi.profile(userId),
    enabled: !!userId,
  });

  const block = useMutation({
    mutationFn: () => moderationApi.block(userId),
    onSuccess: () => toast({ title: "User blocked" }),
    onError: (e) => toast({ variant: "destructive", description: errorMessage(e) }),
  });
  const report = useMutation({
    mutationFn: () =>
      moderationApi.report({
        target_type: ReportTarget.USER,
        target_id: userId,
        reason: ReportReason.OTHER,
      }),
    onSuccess: () => toast({ title: "Report submitted" }),
    onError: (e) => toast({ variant: "destructive", description: errorMessage(e) }),
  });
  const startDm = useMutation({
    mutationFn: () => dmsApi.createOrGet(userId),
    onSuccess: (room) => {
      qc.invalidateQueries({ queryKey: ["dms"] });
      navigate(`/rooms/${room.id}/chat`);
    },
    onError: (e) => toast({ variant: "destructive", description: errorMessage(e) }),
  });

  if (profile.isLoading) return <LoadingPage />;
  if (!profile.data) return <div className="p-10 text-center">Profile not found.</div>;

  const isMe = me?.id === userId;
  const u = profile.data;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6 md:px-6">
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <UserAvatar user={u} className="h-16 w-16" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold">
              {u.first_name} {u.last_name}
            </h1>
            <p className="text-xs uppercase text-muted-foreground">{u.gender} · {u.age}</p>
            {u.bio && <p className="mt-2 text-sm text-muted-foreground">{u.bio}</p>}
          </div>
        </CardContent>
      </Card>

      {u.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Interests</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {u.tags.map((t) => (
              <Badge key={t.id} variant="outline">
                {t.label}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {!isMe && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => startDm.mutate()} disabled={startDm.isPending}>
            <MessageCircle className="h-4 w-4" /> Message
          </Button>
          <Button variant="outline" onClick={() => block.mutate()} disabled={block.isPending}>
            <Shield className="h-4 w-4" /> Block
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (window.confirm("Report this user?")) report.mutate();
            }}
            disabled={report.isPending}
          >
            <Flag className="h-4 w-4" /> Report
          </Button>
        </div>
      )}

      {isMe && (
        <Button variant="outline" onClick={() => navigate("/settings")}>
          <UserMinus className="h-4 w-4" /> Edit my profile
        </Button>
      )}
    </div>
  );
};
