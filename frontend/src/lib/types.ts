/**
 * Types mirroring the AIMarketplace contract state.
 * Ints arrive as number, bigint or string depending on the node; every helper
 * normalizes them to number.
 */

export type SkillStatus = "PENDING_REVIEW" | "ACTIVE" | "REJECTED";
export type PurchaseStatus = "ESCROWED" | "RELEASED" | "REFUNDED" | "DISPUTED";
export type DisputeStatus = "OPEN" | "RESOLVED" | "WITHDRAWN";
export type DisputeOutcome = "" | "NO_REFUND" | "PARTIAL_REFUND" | "FULL_REFUND";

export interface Skill {
  id: number;
  creator: string;
  title: string;
  description: string;
  category: string;
  price: number;
  content_url: string;
  status: SkillStatus;
  score: number;
  review_summary: string;
  moderation_attempts: number;
  last_moderated_at: number;
  created_at: number;
  purchases: number;
  revenue: number;
  disputes: number;
  refunds: number;
}

export interface Purchase {
  id: number;
  skill_id: number;
  buyer: string;
  price: number;
  status: PurchaseStatus;
  dispute_id: number;
  purchased_at: number;
  settled_at: number;
}

export interface Dispute {
  id: number;
  purchase_id: number;
  buyer: string;
  reason: string;
  status: DisputeStatus;
  outcome: DisputeOutcome;
  refund_pct: number;
  verdict_reason: string;
  filed_at: number;
  attempts: number;
  last_judged_at: number;
  stale_at: number;
}

export interface Config {
  skill_count: number;
  purchase_count: number;
  dispute_count: number;
  escrow_locked: number;
  escrow_window_seconds: number;
  dispute_stale_seconds: number;
}

export function toInt(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") return Number(v);
  return 0;
}
