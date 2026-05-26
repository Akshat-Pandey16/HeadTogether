import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { authApi } from "@/lib/api";
import { errorMessage } from "@/lib/api-error";
import { AuthCard } from "./auth-card";

export const ResetPasswordPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({ variant: "destructive", title: "Missing reset token" });
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword({ token, new_password: password });
      toast({ title: "Password reset", description: "Sign in with your new password." });
      navigate("/login", { replace: true });
    } catch (e) {
      toast({ variant: "destructive", title: "Reset failed", description: errorMessage(e) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Reset password"
      description="Choose a new password to access your account."
      footer={
        <Link to="/login" className="font-medium text-foreground hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Resetting…" : "Reset password"}
        </Button>
      </form>
    </AuthCard>
  );
};
