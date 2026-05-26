import { useState } from "react";
import { Flag } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { moderationApi } from "@/lib/api";
import { errorMessage } from "@/lib/api-error";
import { ReportReason, ReportTarget } from "@/types";

const REASON_LABELS: Record<ReportReason, string> = {
  [ReportReason.SPAM]: "Spam or scam",
  [ReportReason.HARASSMENT]: "Harassment or bullying",
  [ReportReason.INAPPROPRIATE]: "Inappropriate content",
  [ReportReason.FAKE_PROFILE]: "Fake profile",
  [ReportReason.OTHER]: "Other",
};

const TARGET_LABELS: Record<ReportTarget, string> = {
  [ReportTarget.USER]: "user",
  [ReportTarget.ROOM]: "room",
  [ReportTarget.MESSAGE]: "message",
};

type Props = {
  targetType: ReportTarget;
  targetId: string;
  trigger?: React.ReactNode;
};

export const ReportDialog = ({ targetType, targetId, trigger }: Props) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>(ReportReason.SPAM);
  const [description, setDescription] = useState("");

  const report = useMutation({
    mutationFn: () =>
      moderationApi.report({
        target_type: targetType,
        target_id: targetId,
        reason,
        description: description || undefined,
      }),
    onSuccess: () => {
      toast({ title: "Report submitted", description: "Thanks — our team will review it." });
      setOpen(false);
      setDescription("");
      setReason(ReportReason.SPAM);
    },
    onError: (e) => toast({ variant: "destructive", description: errorMessage(e) }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost">
            <Flag className="h-4 w-4" /> Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report {TARGET_LABELS[targetType]}</DialogTitle>
          <DialogDescription>
            Tell us what's wrong. Reports are confidential.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as ReportReason)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REASON_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report_desc">Details (optional)</Label>
            <Textarea
              id="report_desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Add context that helps moderators…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => report.mutate()} disabled={report.isPending}>
            {report.isPending ? "Submitting…" : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
