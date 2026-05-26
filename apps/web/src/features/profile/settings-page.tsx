import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { LogOut, Smartphone, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { authApi, notificationsApi, usersApi } from "@/lib/api";
import { errorMessage } from "@/lib/api-error";
import { useAuth, useAuthActions } from "@/providers/auth-provider";
import { Gender } from "@/types";

export const SettingsPage = () => {
  const { user } = useAuth();
  const { logout } = useAuthActions();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const tagsQuery = useQuery({
    queryKey: ["users", "me", "tags"],
    queryFn: () => usersApi.myTags(),
  });
  const tokens = useQuery({
    queryKey: ["device-tokens"],
    queryFn: () => notificationsApi.listTokens(),
  });

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    age: "",
    gender: Gender.PREFER_NOT_TO_SAY as string,
    bio: "",
    avatar_url: "",
  });
  const [tags, setTags] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (!user) return;
    setForm({
      first_name: user.first_name,
      last_name: user.last_name,
      age: String(user.age),
      gender: user.gender,
      bio: user.bio ?? "",
      avatar_url: user.avatar_url ?? "",
    });
  }, [user]);

  useEffect(() => {
    if (tagsQuery.data) setTags(tagsQuery.data.map((t) => t.label).join(", "));
  }, [tagsQuery.data]);

  const updateProfile = useMutation({
    mutationFn: () =>
      usersApi.updateMe({
        first_name: form.first_name,
        last_name: form.last_name,
        age: Number(form.age),
        gender: form.gender as Gender,
        bio: form.bio || undefined,
        avatar_url: form.avatar_url || undefined,
      }),
    onSuccess: (u) => {
      qc.setQueryData(["me"], u);
      toast({ title: "Profile updated" });
    },
    onError: (e) => toast({ variant: "destructive", description: errorMessage(e) }),
  });

  const saveTags = useMutation({
    mutationFn: () =>
      usersApi.setMyTags(
        tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", "me", "tags"] });
      toast({ title: "Interests saved" });
    },
    onError: (e) => toast({ variant: "destructive", description: errorMessage(e) }),
  });

  const changePassword = useMutation({
    mutationFn: () =>
      authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    onSuccess: () => {
      toast({ title: "Password changed" });
      setCurrentPassword("");
      setNewPassword("");
    },
    onError: (e) => toast({ variant: "destructive", description: errorMessage(e) }),
  });

  const logoutAll = useMutation({
    mutationFn: () => authApi.logoutAll(),
    onSuccess: async () => {
      toast({ title: "All sessions signed out" });
      await logout();
      navigate("/login");
    },
    onError: (e) => toast({ variant: "destructive", description: errorMessage(e) }),
  });

  const revokeToken = useMutation({
    mutationFn: (token: string) => notificationsApi.revokeToken(token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["device-tokens"] });
      toast({ title: "Device removed" });
    },
    onError: (e) => toast({ variant: "destructive", description: errorMessage(e) }),
  });

  const deleteAccount = useMutation({
    mutationFn: () => usersApi.deleteMe(),
    onSuccess: async () => {
      toast({ title: "Account deleted" });
      await logout();
      navigate("/login");
    },
    onError: (e) => toast({ variant: "destructive", description: errorMessage(e) }),
  });

  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and account.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger id="gender">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Gender.PREFER_NOT_TO_SAY}>Prefer not to say</SelectItem>
                  <SelectItem value={Gender.MALE}>Male</SelectItem>
                  <SelectItem value={Gender.FEMALE}>Female</SelectItem>
                  <SelectItem value={Gender.OTHER}>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              maxLength={500}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar_url">Avatar URL</Label>
            <Input
              id="avatar_url"
              value={form.avatar_url}
              onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
            />
          </div>
          <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
            Save profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="tags">Comma-separated tags</Label>
          <Input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="movies, hiking, board-games"
          />
          <Button onClick={() => saveTags.mutate()} disabled={saveTags.isPending}>
            Save interests
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="current">Current password</Label>
            <Input
              id="current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new">New password</Label>
            <Input
              id="new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <Button
            onClick={() => changePassword.mutate()}
            disabled={changePassword.isPending || !currentPassword || !newPassword}
          >
            Update password
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" /> Push notification devices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tokens.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !tokens.data || tokens.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No devices registered yet. Push notifications register automatically when enabled.
            </p>
          ) : (
            <ul className="space-y-2">
              {tokens.data.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium capitalize">{t.platform}</p>
                    <p className="text-xs text-muted-foreground">
                      Added {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                      {t.last_seen_at && (
                        <>
                          {" · last seen "}
                          {formatDistanceToNow(new Date(t.last_seen_at), { addSuffix: true })}
                        </>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => revokeToken.mutate(t.id)}
                    disabled={revokeToken.isPending}
                    aria-label="Revoke device"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (
                window.confirm("Sign out of every device and revoke all refresh tokens?")
              ) {
                logoutAll.mutate();
              }
            }}
            disabled={logoutAll.isPending}
          >
            <LogOut className="h-4 w-4" /> Sign out of all sessions
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (
                window.confirm(
                  "Delete your account permanently? You'll lose access to your rooms, DMs, and history.",
                )
              ) {
                deleteAccount.mutate();
              }
            }}
            disabled={deleteAccount.isPending}
          >
            <Trash2 className="h-4 w-4" /> Delete account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
