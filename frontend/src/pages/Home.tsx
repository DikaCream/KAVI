import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMarketplace } from "../context/MarketplaceContext";
import { formatGen } from "../lib/client";
import type { Config } from "../lib/types";

const FEATURES = [
  {
    icon: "🛡️",
    title: "AI moderation",
    body: "Every listing is read by GenLayer's validators before it goes live. They fetch the hosted content, verify it matches the description, and reject spam or prompt-injection.",
  },
  {
    icon: "🎯",
    title: "Quality scoring",
    body: "Approved skills carry a consensus quality score from 0–100, so buyers can compare listings before paying.",
  },
  {
    icon: "🔐",
    title: "Escrow by default",
    body: "Payment is held per-purchase in escrow — never paid out upfront — until the buyer accepts or the escrow window closes.",
  },
  {
    icon: "⚖️",
    title: "AI dispute adjudication",
    body: "If a skill doesn't do what the listing promised, validators compare the listing against the content and rule on a full, partial, or no refund.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "List a skill",
    body: "Describe your AI skill, set a price, and link its public content URL.",
  },
  {
    n: "02",
    title: "AI validators review it",
    body: "Validators fetch the content, judge whether it matches the listing, and score its quality.",
  },
  {
    n: "03",
    title: "Buyers pay into escrow",
    body: "Funds are locked per-purchase until the buyer accepts delivery.",
  },
  {
    n: "04",
    title: "Disputes are adjudicated",
    body: "A buyer who was misled opens a dispute; validators rule on the refund on-chain.",
  },
];

export default function Home() {
  const { contract } = useMarketplace();
  const [config, setConfig] = useState<Config | null>(null);
  const [liveSkills, setLiveSkills] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    contract
      .getConfig()
      .then((c) => alive && setConfig(c))
      .catch(() => {});
    contract
      .listSkills(0, 50)
      .then((list) => alive && setLiveSkills(list.filter((s) => s.status === "ACTIVE").length))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [contract]);

  return (
    <div className="page">
      <section className="hero">
        <div className="container">
          <span className="eyebrow">Powered by GenLayer</span>
          <h1>
            Buy and sell AI skills,
            <br />
            <span className="grad">adjudicated on-chain.</span>
          </h1>
          <p className="lede">
            A marketplace where every listing is read by AI validators, every
            payment is held in escrow, and every dispute is judged on-chain —
            not by a single middleman.
          </p>
          <div className="hero-cta">
            <Link to="/browse" className="primary">
              Browse skills
            </Link>
            <Link to="/list" className="ghost">
              List a skill
            </Link>
          </div>
          <div className="stats-row">
            <Stat value={liveSkills != null ? String(liveSkills) : "–"} label="Live skills" />
            <Stat
              value={config ? formatGen(config.escrow_locked) : "–"}
              label="GEN in escrow"
            />
            <Stat
              value={config ? `${config.dispute_count}` : "–"}
              label="Disputes resolved"
            />
            <Stat value="5/5" label="Validator quorum" />
          </div>
        </div>
      </section>

      <section className="container section">
        <h2 className="section-title">Why GenLayer is central here</h2>
        <div className="grid features">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p className="muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <h2 className="section-title">How it works</h2>
          <div className="steps">
            {STEPS.map((s) => (
              <div className="step" key={s.n}>
                <div className="step-n">{s.n}</div>
                <h3>{s.title}</h3>
                <p className="muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container section cta-band">
        <h2>Ready to list your first AI skill?</h2>
        <p className="muted">
          Connect a wallet, describe what your skill does, and let the validators
          decide if it belongs on-chain.
        </p>
        <Link to="/list" className="primary">
          Get started
        </Link>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
