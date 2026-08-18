import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import { useMarketplace } from "../context/MarketplaceContext";
import { formatGen } from "../lib/client";
import type { Skill } from "../lib/types";

export default function SkillDetail() {
  const { id } = useParams();
  const skillId = Number(id);
  const { contract, wallet } = useMarketplace();
  const [skill, setSkill] = useState<Skill | null>(null);
  const [missing, setMissing] = useState(false);
  const [buying, setBuying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const s = await contract.getSkill(skillId);
    if (s == null) setMissing(true);
    else setSkill(s);
  }, [contract, skillId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (missing) {
    return (
      <div className="container page empty">
        Skill #{skillId} not found.
      </div>
    );
  }
  if (!skill) {
    return <div className="container page empty">Loading…</div>;
  }

  const buy = async () => {
    if (!wallet.address) {
      setError("Connect your wallet to buy this skill.");
      return;
    }
    setBuying(true);
    setError(null);
    try {
      const hash = await contract.purchaseSkill(skill.id, skill.price);
      await contract.waitForReceipt(hash, 60, 4000);
      setNotice("Purchase confirmed — funds are now held in escrow.");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Purchase failed.");
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="container page">
      <Link to="/browse" className="back">
        ← Back to browse
      </Link>

      {error && <div className="error-banner">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      <div className="panel detail-panel">
        <div className="row">
          <h1 style={{ margin: 0 }}>{skill.title}</h1>
          <div className="score big">{skill.score}/100</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className="badge">{skill.category}</span>
          <StatusBadge status={skill.status} />
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            by {skill.creator.slice(0, 8)}…{skill.creator.slice(-6)}
          </span>
        </div>

        <p className="description">{skill.description}</p>

        <div className="review-box">
          <strong>AI moderation review</strong>
          <p className="muted">{skill.review_summary || "No review available."}</p>
        </div>

        <div className="row detail-actions">
          <div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>
              Price (escrowed on purchase)
            </div>
            <strong className="price big">{formatGen(skill.price)}</strong>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <a href={skill.content_url} target="_blank" rel="noreferrer">
              <button className="ghost">View content ↗</button>
            </a>
            <button
              className="buy"
              onClick={buy}
              disabled={buying || !wallet.address || skill.status !== "ACTIVE"}
            >
              {buying
                ? "Buying…"
                : skill.status === "ACTIVE"
                  ? "Buy with escrow"
                  : "Unavailable"}
            </button>
          </div>
        </div>

        <div className="skill-meta">
          <span>{skill.purchases} sales</span>
          <span>{formatGen(skill.revenue)} paid out</span>
          <span>{skill.disputes} disputes</span>
          <span>{skill.refunds} refunds</span>
        </div>
      </div>
    </div>
  );
}
