/**
 * Types mirroring the AIMarketplace contract state.
 *
 * Monetary values (price, revenue, escrow) are stored on-chain in wei and
 * returned by the node as number, bigint or string depending on magnitude;
 * every helper normalizes them to bigint. Small ints (ids, counts, scores)
 * are normalized to number.
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
  price: bigint; // wei
  content_url: string;
  content_snapshot: string; // immutable text pinned by validators at approval
  content_hash: string; // keccak-256 hex of content_snapshot
  status: SkillStatus;
  score: number;
  review_summary: string;
  moderation_attempts: number;
  last_moderated_at: number;
  created_at: number;
  purchases: number;
  revenue: bigint; // wei
  disputes: number;
  refunds: number;
}

export interface Purchase {
  id: number;
  skill_id: number;
  buyer: string;
  price: bigint; // wei
  content_hash: string; // the immutable content version this purchase is bound to
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
  buyer_evidence: string; // on-chain evidence submitted by the buyer
  creator_evidence: string; // on-chain evidence submitted by the creator
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
  escrow_locked: bigint; // wei
  escrow_window_seconds: number;
  dispute_stale_seconds: number;
}

export function toInt(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") return Number(v);
  return 0;
}

export function toBigInt(v: unknown): bigint {
  if (typeof v === "bigint") return v;
  if (typeof v === "number") return BigInt(Math.round(v));
  if (typeof v === "string") return BigInt(v);
  return 0n;
}
