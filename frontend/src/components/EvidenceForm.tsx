import { useEffect, useMemo, useState } from "react";
import { keccak256 } from "viem/utils";
import type { Marketplace } from "../lib/contract";
import type { Dispute } from "../lib/types";

const EVIDENCE_KINDS = [
  ["EXECUTION_LOG", "Execution log"],
  ["ERROR_REPORT", "Error report"],
  ["TRANSACTION_RECEIPT", "Transaction receipt"],
  ["SCREENSHOT", "Screenshot"],
  ["OTHER", "Other artifact"],
] as const;

/**
 * Structured, authenticated evidence for an open dispute.
 *
 * The wallet signs the transaction, while the contract stores a fixed kind,
 * artifact digest, reference, and details. Validator adjudication can only
 * start after both parties submit or the evidence window closes.
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
  const [kind, setKind] = useState("EXECUTION_LOG");
  const [reference, setReference] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (dispute.status !== "OPEN") return;
    const timer = window.setInterval(
      () => setNow(Math.floor(Date.now() / 1000)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [dispute.status]);

  const mine =
    role === "buyer"
      ? {
          details: dispute.buyer_evidence,
          kind: dispute.buyer_evidence_kind,
          hash: dispute.buyer_evidence_hash,
          reference: dispute.buyer_evidence_reference,
        }
      : {
          details: dispute.creator_evidence,
          kind: dispute.creator_evidence_kind,
          hash: dispute.creator_evidence_hash,
          reference: dispute.creator_evidence_reference,
        };
  const theirs =
    role === "buyer"
      ? {
          details: dispute.creator_evidence,
          kind: dispute.creator_evidence_kind,
          hash: dispute.creator_evidence_hash,
          reference: dispute.creator_evidence_reference,
        }
      : {
          details: dispute.buyer_evidence,
          kind: dispute.buyer_evidence_kind,
          hash: dispute.buyer_evidence_hash,
          reference: dispute.buyer_evidence_reference,
        };

  const bothSubmitted = Boolean(
    dispute.buyer_evidence_hash && dispute.creator_evidence_hash,
  );
  const deadlinePassed = now >= dispute.evidence_deadline;
  const canFinalize = bothSubmitted || deadlinePassed;
  const retryReady =
    dispute.attempts > 0 &&
    now >= dispute.last_judged_at + 300 &&
    canFinalize;
  // The contract verifies evidence_hash == Keccak256(details) on-chain, so the
  // hash is derived from the submitted details rather than typed by hand.
  const computedHash = useMemo(() => {
    const d = details.trim();
    if (d.length < 20 || d.length > 3000) return "";
    return keccak256(new TextEncoder().encode(d)).slice(2);
  }, [details]);
  const hashIsValid = /^[0-9a-f]{64}$/.test(computedHash);
  const formIsValid =
    hashIsValid &&
    reference.trim().length > 0 &&
    reference.trim().length <= 500 &&
    details.trim().length >= 20 &&
    details.trim().length <= 3000;

  const deadlineText = useMemo(() => {
    if (!dispute.evidence_deadline) return "the evidence window";
    return new Date(dispute.evidence_deadline * 1000).toLocaleString();
  }, [dispute.evidence_deadline]);

  const run = async (action: string, fn: () => Promise<string>) => {
    setBusy(action);
    setError(null);
    try {
      const hash = await fn();
      await contract.waitForReceipt(hash, 60, 4000);
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed.");
    } finally {
      setBusy(null);
    }
  };

  const submit = () =>
    run("evidence", async () => {
      const tx = await contract.submitDisputeEvidence(
        dispute.id,
        kind,
        computedHash,
        reference.trim(),
        details.trim(),
      );
      setReference("");
      setDetails("");
      return tx;
    });

  const finalize = () =>
    run(
      dispute.attempts > 0 ? "retry" : "finalize",
      dispute.attempts > 0
        ? () => contract.retryDispute(dispute.id)
        : () => contract.finalizeDispute(dispute.id),
    );

  return (
    <div className="evidence-box">
      {theirs.hash && (
        <div className="evidence-record">
          <strong>{role === "buyer" ? "Creator" : "Buyer"} evidence</strong>
          <span>{theirs.kind || "Structured artifact"}</span>
          <code>{theirs.hash.slice(0, 16)}…</code>
          <small>{theirs.reference}</small>
          <p>{theirs.details}</p>
        </div>
      )}

      {mine.hash ? (
        <div className="evidence-record mine">
          <strong>Your authenticated evidence</strong>
          <span>{mine.kind || "Structured artifact"}</span>
          <code>{mine.hash.slice(0, 16)}…</code>
          <small>{mine.reference}</small>
          <p>{mine.details}</p>
        </div>
      ) : (
        <div className="evidence-fields">
          <label>
            Evidence type
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {EVIDENCE_KINDS.map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Artifact hash (computed from details)
            <input
              value={computedHash || "Paste details to compute…"}
              disabled
              aria-label={`${role} evidence artifact hash`}
            />
          </label>
          <label>
            Artifact reference
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="https://… or onchain://purchase/…"
              aria-label={`${role} evidence artifact reference`}
            />
          </label>
          <label>
            Evidence details
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Paste the raw artifact bytes — the execution log, error output, or transaction receipt — that prove your claim (20 to 3000 characters). The hash above is Keccak-256 of this text and is verified on-chain."
              rows={4}
              aria-label={`${role} evidence details`}
            />
          </label>
          {error && <div className="error-banner">{error}</div>}
          <button
            className="ghost small"
            disabled={!formIsValid || busy !== null}
            onClick={submit}
          >
            {busy === "evidence" ? "Submitting…" : "Submit authenticated evidence"}
          </button>
        </div>
      )}

      {dispute.status === "OPEN" && (
        <div className="evidence-footer">
          <p className="muted">
            {bothSubmitted
              ? "Both parties have submitted. Validators can now review this dispute."
              : deadlinePassed
                ? "The evidence window has closed. Anyone may now start validator review."
                : `Evidence window closes ${deadlineText}. You can submit once before then.`}
          </p>
          {canFinalize && (
            <button
              className="primary small"
              disabled={busy !== null || (dispute.attempts > 0 && !retryReady)}
              onClick={finalize}
            >
              {busy === "finalize"
                ? "Sending to validators…"
                : busy === "retry"
                  ? "Retrying validator review…"
                  : dispute.attempts > 0
                    ? retryReady
                      ? "Retry validator review"
                      : "Validator retry cooling down"
                    : "Send to validators"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
