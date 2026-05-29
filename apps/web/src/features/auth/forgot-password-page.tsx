import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { authApi } from "@/lib/api";
import { errorMessage } from "@/lib/api-error";
import { AuthCard } from "./auth-card";

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authApi.forgotPassword({ email });
      setDone(true);
    } catch (e) {
      toast({ variant: "destructive", title: "Failed", description: errorMessage(e) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Forgot password"
      description="We'll send a reset link if the email is registered."
      footer={
        <>
          Remembered it?{" "}
          <Link
            to="/login"
            className="font-bold text-foreground underline decoration-2 underline-offset-2 hover:text-acid"
          >
            Back to sign in
          </Link>
        </>
      }
    >
      {done ? (
        <div className="rounded-sm border-2 border-ink bg-acid/15 p-4 text-sm">
          If an account exists for <span className="font-bold">{email}</span>, a reset link is on
          its way.
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" variant="acid" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
};
