import { useState } from "react";
import type { Marketplace } from "../lib/contract";
import type { Dispute } from "../lib/types";

/**
 * Authenticated on-chain evidence for an open dispute.
 *
 * Evidence is bound to the submitting wallet: only the buyer or the skill's
 * creator may submit, and the transaction itself authenticates the claim.
 * Validators weigh it when adjudicating.
 */
export default function EvidenceForm({
  dispute,
  role,
  contract,
  onSubmitted,
}: {
  dispute: Dispute;
  role: "buyer" | "creator";
  contract: Marketplace;
  onSubmitted: () => void;
}) {
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mine =
    role === "buyer" ? dispute.buyer_evidence : dispute.creator_evidence;
  const theirs =
    role === "buyer" ? dispute.creator_evidence : dispute.buyer_evidence;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const hash = await contract.submitDisputeEvidence(
        dispute.id,
        evidence.trim(),
      );
      await contract.waitForReceipt(hash, 60, 4000);
      onSubmitted();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not submit evidence.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="evidence-box">
      {theirs && (
        <p className="muted" style={{ fontSize: "0.8rem", margin: "0 0 8px" }}>
          {role === "buyer" ? "Creator" : "Buyer"} submitted evidence: “
          {theirs}”
        </p>
      )}
      {mine ? (
        <p className="muted" style={{ fontSize: "0.8rem", margin: 0 }}>
          ✓ Your evidence is on-chain: “{mine}”
        </p>
      ) : (
        <>
          <textarea
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder={`Attach ${role} evidence — execution logs, exact errors, receipts (20+ chars)…`}
            rows={3}
            minLength={20}
            aria-label={`${role} evidence`}
          />
          {error && <div className="error-banner">{error}</div>}
          <button
            className="ghost small"
            style={{ marginTop: 8 }}
            disabled={evidence.trim().length < 20 || busy}
            onClick={submit}
          >
            {busy ? "Submitting…" : "Submit evidence"}
          </button>
        </>
      )}
    </div>
  );
}
