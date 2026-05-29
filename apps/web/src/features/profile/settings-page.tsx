import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings as SettingsIcon, ShieldOff, Smartphone, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { UserAvatar } from "@/components/shared/user-avatar";
import { authApi, moderationApi, notificationsApi, usersApi } from "@/lib/api";
import { errorMessage } from "@/lib/api-error";
import { relativeTime } from "@/lib/format";
import { useAuth, useAuthActions } from "@/providers/auth-provider";
import { Gender } from "@/types";

const Section = ({
  title,
  icon,
  danger,
  className,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  danger?: boolean;
  className?: string;
  children: React.ReactNode;
}) => (
  <section
    className={`rounded-sm border-2 ${danger ? "border-destructive" : "border-ink"} bg-card ${className ?? ""}`}
  >
    <div
      className={`flex items-center gap-2 border-b-2 ${danger ? "border-destructive" : "border-ink"} px-4 py-2.5`}
    >
      {icon}
      <h2 className={`font-display text-base font-bold ${danger ? "text-destructive" : ""}`}>
        {title}
      </h2>
    </div>
    <div className="space-y-4 p-4">{children}</div>
  </section>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    {children}
  </div>
);

export const SettingsPage = () => {
  const { user } = useAuth();
  const { logout } = useAuthActions();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const tagsQuery = useQuery({ queryKey: ["users", "me", "tags"], queryFn: () => usersApi.myTags() });
  const tokens = useQuery({ queryKey: ["device-tokens"], queryFn: () => notificationsApi.listTokens() });
  const blocked = useQuery({ queryKey: ["moderation", "blocks"], queryFn: () => moderationApi.listBlocked() });

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
      usersApi.setMyTags(tags.split(",").map((t) => t.trim()).filter(Boolean)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", "me", "tags"] });
      toast({ title: "Interests saved" });
    },
    onError: (e) => toast({ variant: "destructive", description: errorMessage(e) }),
  });

  const changePassword = useMutation({
    mutationFn: () =>
      authApi.changePassword({ current_password: currentPassword, new_password: newPassword }),
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
    mutationFn: (id: string) => notificationsApi.revokeToken(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["device-tokens"] });
      toast({ title: "Device removed" });
    },
    onError: (e) => toast({ variant: "destructive", description: errorMessage(e) }),
  });

  const unblock = useMutation({
    mutationFn: (id: string) => moderationApi.unblock(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderation", "blocks"] });
      toast({ title: "Unblocked" });
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
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b-2 border-ink bg-card px-4 py-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-sm border-2 border-ink bg-secondary">
          <SettingsIcon className="h-5 w-5" strokeWidth={2.5} />
        </span>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Settings</h1>
          <p className="font-mono text-[11px] text-muted-foreground">profile · account · privacy</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Section title="Profile" className="lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name">
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                />
              </Field>
              <Field label="Last name">
                <Input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                />
              </Field>
              <Field label="Age">
                <Input
                  type="number"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                />
              </Field>
              <Field label="Gender">
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Gender.PREFER_NOT_TO_SAY}>Prefer not to say</SelectItem>
                    <SelectItem value={Gender.MALE}>Male</SelectItem>
                    <SelectItem value={Gender.FEMALE}>Female</SelectItem>
                    <SelectItem value={Gender.OTHER}>Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Bio">
                  <Textarea
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    maxLength={500}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Avatar URL">
                  <Input
                    value={form.avatar_url}
                    onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                    placeholder="https://…"
                  />
                </Field>
              </div>
            </div>
            <Button variant="acid" onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
              Save profile
            </Button>
          </Section>

          <Section title="Interests">
            <Field label="Comma-separated tags">
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="movies, hiking, board-games"
              />
            </Field>
            <Button onClick={() => saveTags.mutate()} disabled={saveTags.isPending}>
              Save interests
            </Button>
          </Section>

          <Section title="Change password">
            <Field label="Current password">
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </Field>
            <Field label="New password">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Field>
            <Button
              onClick={() => changePassword.mutate()}
              disabled={changePassword.isPending || !currentPassword || !newPassword}
            >
              Update password
            </Button>
          </Section>

          <Section title="Devices" icon={<Smartphone className="h-4 w-4" strokeWidth={2.5} />}>
            {tokens.isLoading ? (
              <p className="font-mono text-xs text-muted-foreground">Loading…</p>
            ) : !tokens.data || tokens.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No devices registered. Push tokens register automatically when enabled.
              </p>
            ) : (
              <ul className="space-y-2">
                {tokens.data.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-sm border-2 border-ink p-2.5"
                  >
                    <div className="min-w-0">
                      <p className="font-bold capitalize">{t.platform}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        added {relativeTime(t.created_at)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive"
                      onClick={() => revokeToken.mutate(t.id)}
                      disabled={revokeToken.isPending}
                    >
                      <X className="h-4 w-4" strokeWidth={2.5} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Blocked users" icon={<ShieldOff className="h-4 w-4" strokeWidth={2.5} />}>
            {blocked.isLoading ? (
              <p className="font-mono text-xs text-muted-foreground">Loading…</p>
            ) : !blocked.data || blocked.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">You haven't blocked anyone.</p>
            ) : (
              <ul className="space-y-2">
                {blocked.data.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-2 rounded-sm border-2 border-ink p-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <UserAvatar user={u} className="h-8 w-8" />
                      <span className="truncate text-sm font-bold">
                        {u.first_name} {u.last_name}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unblock.mutate(u.id)}
                      disabled={unblock.isPending}
                    >
                      Unblock
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="Account"
            danger
            icon={<Trash2 className="h-4 w-4 text-destructive" strokeWidth={2.5} />}
            className="lg:col-span-2"
          >
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  await logout();
                  navigate("/login");
                }}
              >
                <LogOut className="h-4 w-4" strokeWidth={2.5} /> Sign out
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (window.confirm("Sign out of every device and revoke all sessions?"))
                    logoutAll.mutate();
                }}
                disabled={logoutAll.isPending}
              >
                <LogOut className="h-4 w-4" strokeWidth={2.5} /> Sign out everywhere
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (window.confirm("Delete your account? You'll lose your rooms, DMs and history."))
                    deleteAccount.mutate();
                }}
                disabled={deleteAccount.isPending}
              >
                <Trash2 className="h-4 w-4" strokeWidth={2.5} /> Delete account
              </Button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
};
