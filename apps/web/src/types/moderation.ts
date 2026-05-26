import type { ReportReason, ReportStatus, ReportTarget } from "./enums";

export type ReportCreatePayload = {
  target_type: ReportTarget;
  target_id: string;
  reason: ReportReason;
  description?: string;
};

export type Report = {
  id: string;
  reporter_id: string;
  target_type: ReportTarget;
  target_id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  created_at: string;
  reviewed_at: string | null;
};
