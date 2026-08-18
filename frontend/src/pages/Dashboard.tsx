import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import { useMarketplace } from "../context/MarketplaceContext";
import { formatGen } from "../lib/client";
import type { Dispute, Purchase, Skill } from "../lib/types";

export default function Dashboard() {
  const { contract, wallet } = useMarketplace();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!wallet.address) {
      setSkills([]);
      setPurchases([]);
      return;
    }
    try {
      const [s, p] = await Promise.all([
        contract.listCreatorSkills(wallet.address, 0, 50),
        contract.listBuyerPurchases(wallet.address, 0, 50),
      ]);
      setSkills(s);
      setPurchases(p);
    } catch {
      setError("Could not load your dashboard data.");
    }
  }, [contract, wallet.address]);

  useEffect(() => {
    refresh();
  }, [refresh, tick]);

  // Poll while anything is still settling.
  useEffect(() => {
    const busy =
      skills.some((s) => s.status === "PENDING_REVIEW") ||
      purchases.some((p) => p.status === "ESCROWED" || p.status === "DISPUTED");
    if (!busy) return;
    const id = setInterval(() => setTick((t) => t + 1), 6000);
    return () => clearInterval(id);
  }, [skills, purchases]);

  if (!wallet.address) {
    return (
      <div className="container page empty">
        Connect your wallet to see your dashboard.
      </div>
    );
  }

  const revenue = skills.reduce((sum, s) => sum + s.revenue, 0n);
  const escrowed = purchases
    .filter((p) => p.status === "ESCROWED" || p.status === "DISPUTED")
    .reduce((sum, p) => sum + p.price, 0n);

  return (
    <div className="container page">
      <div className="page-head">
        <span className="kicker">~/dashboard · your activity</span>
        <h1 style={{ marginTop: 8 }}>Dashboard</h1>
        <p className="muted">Your listings, sales, and escrow on-chain.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="stats-row">
        <MiniStat value={String(skills.length)} label="Listed" />
        <MiniStat value={formatGen(revenue)} label="Earned" />
        <MiniStat value={String(purchases.length)} label="Purchases" />
        <MiniStat value={formatGen(escrowed)} label="In escrow" />
      </div>

      <h2 className="section-title">My skills</h2>
      {skills.length === 0 ? (
        <div className="panel muted">
          You haven't listed anything yet.{" "}
          <Link to="/list">List your first skill →</Link>
        </div>
      ) : (
        <div className="grid">
          {skills.map((s) => (
            <div className="card" key={s.id}>
              <div className="row">
                <Link to={`/skill/${s.id}`} className="plain">
                  {s.title}
                </Link>
                <StatusBadge status={s.status} />
              </div>
              <span className="badge">{s.category}</span>
              <div className="muted" style={{ fontSize: "0.85rem" }}>
                {formatGen(s.price)} · score {s.score}/100
              </div>
              <div className="muted" style={{ fontSize: "0.8rem" }}>
                {s.purchases} sales · {formatGen(s.revenue)} · {s.refunds} refunds
              </div>
              {s.status === "REJECTED" && s.review_summary && (
                <div className="muted" style={{ fontSize: "0.82rem" }}>
                  “{s.review_summary}”
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title">My purchases</h2>
      {purchases.length === 0 ? (
        <div className="panel muted">
          You haven't bought anything yet.{" "}
          <Link to="/browse">Browse skills →</Link>
        </div>
      ) : (
        <div className="stack">
          {purchases.map((p) => (
            <PurchaseRow
              key={p.id}
              purchase={p}
              contract={contract}
              onChanged={() => setTick((t) => t + 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function PurchaseRow({
  purchase: p,
  contract,
  onChanged,
}: {
  purchase: Purchase;
  contract: ReturnType<typeof useMarketplace>["contract"];
  onChanged: () => void;
}) {
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [reason, setReason] = useState("");
  const [filing, setFiling] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (p.dispute_id) {
      contract.getDispute(p.dispute_id).then(setDispute).catch(() => {});
    }
  }, [p.dispute_id, contract]);

  const run = async (key: string, fn: () => Promise<string>) => {
    setBusy(key);
    try {
      const hash = await fn();
      await contract.waitForReceipt(hash, 60, 4000);
      onChanged();
    } catch {
      /* error is surfaced by the caller where relevant */
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card purchase-card">
      <div className="row">
        <div>
          <strong>Purchase #{p.id}</strong>
          <span className="muted" style={{ marginLeft: 8, fontSize: "0.8rem" }}>
            Skill #{p.skill_id} · {formatGen(p.price)}
          </span>
        </div>
        <StatusBadge status={p.status} />
      </div>

      {p.status === "ESCROWED" && (
        <div className="row" style={{ marginTop: 10 }}>
          <button
            className="primary"
            disabled={busy !== null}
            onClick={() =>
              run("release", () => contract.releasePurchase(p.id))
            }
          >
            {busy === "release" ? "Releasing…" : "Accept & release"}
          </button>
          <button
            className="danger"
            disabled={busy !== null}
            onClick={() => setFiling(true)}
          >
            File dispute
          </button>
        </div>
      )}

      {filing && (
        <div className="dispute-form">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain what the skill does not deliver vs its listing (50+ chars)…"
            rows={3}
            minLength={50}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              className="danger"
              disabled={reason.trim().length < 50 || busy !== null}
              onClick={() =>
                run("dispute", async () => {
                  const h = await contract.fileDispute(p.id, reason.trim());
                  setReason("");
                  setFiling(false);
                  return h;
                })
              }
            >
              Submit dispute
            </button>
            <button className="ghost" onClick={() => setFiling(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {p.status === "DISPUTED" && dispute && (
        <div className="notice" style={{ marginTop: 10 }}>
          <div className="row">
            <strong>Dispute #{dispute.id}</strong>
            <StatusBadge status={dispute.status} />
          </div>
          {dispute.outcome ? (
            <>
              <div className="muted">
                Outcome:{" "}
                <strong>{dispute.outcome.replace(/_/g, " ")}</strong> (
                {dispute.refund_pct}%)
              </div>
              {dispute.verdict_reason && (
                <div className="muted" style={{ fontSize: "0.85rem" }}>
                  “{dispute.verdict_reason}”
                </div>
              )}
              <button
                onClick={() =>
                  run("settle", () => contract.settleDispute(dispute.id))
                }
                disabled={busy !== null}
                style={{ marginTop: 10 }}
              >
                {busy === "settle" ? "Settling…" : "Settle dispute"}
              </button>
            </>
          ) : (
            <div className="muted">Awaiting validator decision…</div>
          )}
        </div>
      )}
    </div>
  );
}
