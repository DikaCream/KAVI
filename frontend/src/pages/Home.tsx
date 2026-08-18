import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AnimatedNumber from "../components/AnimatedNumber";
import ParticleField from "../components/ParticleField";
import ScrollReveal from "../components/ScrollReveal";
import { useMarketplace } from "../context/MarketplaceContext";

const FEATURES = [
  {
    icon: "🧠",
    title: "AI reads every listing",
    body: "Validators fetch your content URL and check it actually does what the listing claims. Spam, scams, and prompt-injection never make it on-chain.",
  },
  {
    icon: "⚖️",
    title: "Disputes judged by validators",
    body: "A misleading listing goes to a decentralized AI tribunal that rules a full, partial, or no refund — and writes down why.",
  },
  {
    icon: "🔒",
    title: "Escrow, not promises",
    body: "Payment is locked per-purchase. The seller gets paid only when you accept delivery, or when the escrow window closes.",
  },
  {
    icon: "🎯",
    title: "Quality you can compare",
    body: "Approved skills carry a consensus score from 0–100, so you can tell a polished agent from a rough one before paying.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "List a skill",
    body: "Describe what your agent does and link its public content.",
  },
  {
    n: "02",
    title: "Validators review it",
    body: "They fetch the content, verify it matches, and score it.",
  },
  {
    n: "03",
    title: "Buyers pay into escrow",
    body: "Funds stay locked until delivery is accepted.",
  },
  {
    n: "04",
    title: "Disputes are adjudicated",
    body: "Validators compare the listing to the content and rule the refund.",
  },
];

export default function Home() {
  const { contract } = useMarketplace();
  const [liveSkills, setLiveSkills] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    contract
      .listSkills(0, 50)
      .then((list) =>
        alive ? setLiveSkills(list.filter((s) => s.status === "ACTIVE").length) : null,
      )
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [contract]);

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      <section className="hero">
        <ParticleField />
        <div className="container">
          <span className="eyebrow">
            <span className="pulse" />
            Built on GenLayer · AI-validator consensus
          </span>
          <h1>
            The marketplace that
            <br />
            <span className="grad">reads what it sells.</span>
          </h1>
          <p className="lede">
            Every skill is fetched, judged, and scored by a decentralized quorum
            of AI validators before it goes live. When something goes wrong, the
            same validators rule on your refund — on-chain, with no middleman.
          </p>
          <div className="hero-cta">
            <Link to="/browse" className="primary">
              Browse skills →
            </Link>
            <Link to="/list" className="ghost">
              List a skill
            </Link>
          </div>
          <div className="stats-row">
            <Stat value={liveSkills} label="Live skills" />
            <StaticStat value="7 days" label="Escrow window" />
            <StaticStat value="5 / 5" label="Validator quorum" />
            <StaticStat value="0–100" label="Quality score" />
          </div>
        </div>
      </section>

      <section className="container section">
        <ScrollReveal>
          <h2 className="section-title">
            No middleman. <span className="accent">No trust-me.</span>
          </h2>
        </ScrollReveal>
        <div className="grid features">
          {FEATURES.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 70}>
              <div className="feature-card">
                <div className="icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <ScrollReveal>
            <h2 className="section-title">How a listing goes live</h2>
          </ScrollReveal>
          <div className="steps">
            {STEPS.map((s, i) => (
              <ScrollReveal key={s.n} delay={i * 70}>
                <div className="step">
                  <div className="step-n">{s.n}</div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container section cta-band">
        <ScrollReveal>
          <h2>Put your skill in front of an AI jury.</h2>
          <p className="muted">
            Connect a wallet, describe what your agent does, and let the
            validators decide if it belongs on-chain.
          </p>
          <Link to="/list" className="primary">
            List a skill
          </Link>
        </ScrollReveal>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: number | null; label: string }) {
  return (
    <div className="stat">
      <div className="stat-value">
        {value == null ? "–" : <AnimatedNumber value={value} />}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function StaticStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
