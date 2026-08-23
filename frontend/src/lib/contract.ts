import { CONTRACT_ADDRESS } from "../config";
import {
  Config,
  Dispute,
  Purchase,
  Skill,
  SkillContent,
  toBigInt,
  toInt,
} from "./types";

function fromMapLike(v: any): Record<string, any> {
  if (v instanceof Map) {
    const out: Record<string, any> = {};
    v.forEach((val: any, key: any) => {
      out[String(key)] = val;
    });
    return out;
  }
  return (v ?? {}) as Record<string, any>;
}

function toSkill(v: any): Skill {
  const o = fromMapLike(v);
  return {
    id: toInt(o.id),
    creator: String(o.creator ?? ""),
    title: String(o.title ?? ""),
    description: String(o.description ?? ""),
    category: String(o.category ?? ""),
    price: toBigInt(o.price),
    content_url: String(o.content_url ?? ""),
    // content_snapshot intentionally omitted from public view
    content_hash: String(o.content_hash ?? ""),
    status: String(o.status) as Skill["status"],
    score: toInt(o.score),
    review_summary: String(o.review_summary ?? ""),
    moderation_attempts: toInt(o.moderation_attempts),
    last_moderated_at: toInt(o.last_moderated_at),
    created_at: toInt(o.created_at),
    purchases: toInt(o.purchases),
    revenue: toBigInt(o.revenue),
    disputes: toInt(o.disputes),
    refunds: toInt(o.refunds),
  };
}

function toPurchase(v: any): Purchase {
  const o = fromMapLike(v);
  return {
    id: toInt(o.id),
    skill_id: toInt(o.skill_id),
    buyer: String(o.buyer ?? ""),
    price: toBigInt(o.price),
    content_hash: String(o.content_hash ?? ""),
    status: String(o.status) as Purchase["status"],
    dispute_id: toInt(o.dispute_id),
    purchased_at: toInt(o.purchased_at),
    settled_at: toInt(o.settled_at),
  };
}

function toDispute(v: any): Dispute {
  const o = fromMapLike(v);
  return {
    id: toInt(o.id),
    purchase_id: toInt(o.purchase_id),
    buyer: String(o.buyer ?? ""),
    reason: String(o.reason ?? ""),
    buyer_evidence: String(o.buyer_evidence ?? ""),
    creator_evidence: String(o.creator_evidence ?? ""),
    buyer_evidence_kind: String(o.buyer_evidence_kind ?? ""),
    creator_evidence_kind: String(o.creator_evidence_kind ?? ""),
    buyer_evidence_hash: String(o.buyer_evidence_hash ?? ""),
    creator_evidence_hash: String(o.creator_evidence_hash ?? ""),
    buyer_evidence_reference: String(o.buyer_evidence_reference ?? ""),
    creator_evidence_reference: String(o.creator_evidence_reference ?? ""),
    status: String(o.status) as Dispute["status"],
    outcome: String(o.outcome ?? "") as Dispute["outcome"],
    refund_pct: toInt(o.refund_pct),
    verdict_reason: String(o.verdict_reason ?? ""),
    filed_at: toInt(o.filed_at),
    evidence_deadline: toInt(o.evidence_deadline),
    attempts: toInt(o.attempts),
    last_judged_at: toInt(o.last_judged_at),
    stale_at: toInt(o.stale_at),
  };
}

function toConfig(v: any): Config {
  const o = fromMapLike(v);
  return {
    skill_count: toInt(o.skill_count),
    purchase_count: toInt(o.purchase_count),
    dispute_count: toInt(o.dispute_count),
    escrow_locked: toBigInt(o.escrow_locked),
    escrow_window_seconds: toInt(o.escrow_window_seconds),
    dispute_stale_seconds: toInt(o.dispute_stale_seconds),
    dispute_evidence_window_seconds: toInt(o.dispute_evidence_window_seconds),
  };
}

/**
 * Typed wrapper over the deployed AIMarketplace contract.
 * Read methods work without an account; write methods sign via the client.
 */
export class Marketplace {
  constructor(private client: any, private address: string = CONTRACT_ADDRESS) {}

  private async read(functionName: string, args: unknown[] = []): Promise<any> {
    return this.client.readContract({
      address: this.address as `0x${string}`,
      functionName,
      args,
    });
  }

  private async write(
    functionName: string,
    args: unknown[],
    value: bigint = 0n,
  ): Promise<string> {
    const txHash = await this.client.writeContract({
      address: this.address as `0x${string}`,
      functionName,
      args,
      value,
    });
    return txHash as string;
  }

  async waitForReceipt(txHash: string, retries = 40, interval = 3000): Promise<any> {
    return this.client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED" as any,
      retries,
      interval,
    });
  }

  // ---- reads ----------------------------------------------------------
  async getConfig(): Promise<Config> {
    return toConfig(await this.read("get_config"));
  }

  async getSkill(id: number): Promise<Skill | null> {
    const v = await this.read("get_skill", [id]);
    if (v == null) return null;
    return toSkill(v);
  }

  async getPurchase(id: number): Promise<Purchase | null> {
    const v = await this.read("get_purchase", [id]);
    if (v == null) return null;
    return toPurchase(v);
  }

  async getDispute(id: number): Promise<Dispute | null> {
    const v = await this.read("get_dispute", [id]);
    if (v == null) return null;
    return toDispute(v);
  }

  async getSkillCount(): Promise<number> {
    return toInt(await this.read("get_skill_count"));
  }

  async getSkillContent(id: number): Promise<SkillContent | null> {
    const v = await this.read("get_skill_content", [id]);
    if (v == null) return null;
    const o = fromMapLike(v);
    return {
      content_snapshot: String(o.content_snapshot ?? ""),
      content_hash: String(o.content_hash ?? ""),
      reason: o.reason ? String(o.reason) : undefined,
    };
  }

  async listSkills(offset = 0, limit = 50): Promise<Skill[]> {
    const v = await this.read("list_skills", [offset, limit]);
    return Array.isArray(v) ? v.map(toSkill) : [];
  }

  async listCreatorSkills(creator: string, offset = 0, limit = 50): Promise<Skill[]> {
    const v = await this.read("list_creator_skills", [creator, offset, limit]);
    return Array.isArray(v) ? v.map(toSkill) : [];
  }

  async listBuyerPurchases(buyer: string, offset = 0, limit = 50): Promise<Purchase[]> {
    const v = await this.read("list_buyer_purchases", [buyer, offset, limit]);
    return Array.isArray(v) ? v.map(toPurchase) : [];
  }

  async listSkillPurchases(skillId: number, offset = 0, limit = 50): Promise<Purchase[]> {
    const v = await this.read("list_skill_purchases", [skillId, offset, limit]);
    return Array.isArray(v) ? v.map(toPurchase) : [];
  }

  // ---- writes ---------------------------------------------------------
  async submitSkill(
    title: string,
    description: string,
    category: string,
    priceWei: bigint,
    contentUrl: string,
  ) {
    return this.write("submit_skill", [
      title,
      description,
      category,
      priceWei,
      contentUrl,
    ]);
  }

  async purchaseSkill(skillId: number, priceWei: bigint) {
    return this.write("purchase_skill", [skillId], priceWei);
  }

  async releasePurchase(purchaseId: number) {
    return this.write("release_purchase", [purchaseId]);
  }

  async fileDispute(purchaseId: number, reason: string) {
    return this.write("file_dispute", [purchaseId, reason]);
  }

  async retryDispute(disputeId: number) {
    return this.write("retry_dispute", [disputeId]);
  }

  async withdrawDispute(disputeId: number) {
    return this.write("withdraw_dispute", [disputeId]);
  }

  async submitDisputeEvidence(
    disputeId: number,
    evidenceKind: string,
    evidenceHash: string,
    evidenceReference: string,
    evidenceDetails: string,
  ) {
    return this.write("submit_dispute_evidence", [
      disputeId,
      evidenceKind,
      evidenceHash,
      evidenceReference,
      evidenceDetails,
    ]);
  }

  async finalizeDispute(disputeId: number) {
    return this.write("finalize_dispute", [disputeId]);
  }

  async settleDispute(disputeId: number) {
    return this.write("settle_dispute", [disputeId]);
  }

  async retryModeration(skillId: number) {
    return this.write("retry_moderation", [skillId]);
  }
}
