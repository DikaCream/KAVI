import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AnimatedNumber from "../components/AnimatedNumber";
import ParticleField from "../components/ParticleField";
import ScrollReveal from "../components/ScrollReveal";
import { useMarketplace } from "../context/MarketplaceContext";

const REGIONS = [
  {
    coord: "~/browse",
    title: "Browse",
    body: "Every approved skill on-chain, scored by validators.",
    to: "/browse",
    color: "#06d6c4",
  },
  {
    coord: "~/list",
    title: "List a skill",
    body: "Submit your agent for validator review.",
    to: "/list",
    color: "#9b8fff",
  },
  {
    coord: "~/dashboard",
    title: "Dashboard",
    body: "Your listings, sales, and locked escrow.",
    to: "/dashboard",
    color: "#cfff04",
  },
  {
    coord: "~/architecture",
    title: "Architecture",
    body: "How the AI validators reach consensus.",
    to: "/architecture",
    color: "#b14dff",
  },
  {
    coord: "~/dispute",
    title: "Dispute",
    body: "Let the AI jury rule on a refund.",
    to: "/architecture",
    color: "#ff3d7a",
  },
];

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
  { n: "01", title: "List", body: "Describe your agent and link its public content." },
  { n: "02", title: "Review", body: "Validators fetch it, verify it, and score it." },
  { n: "03", title: "Escrow", body: "Funds stay locked until delivery is accepted." },
  { n: "04", title: "Adjudicate", body: "Validators compare listing vs content and rule." },
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
            ~/manifesto · estás aquí
          </span>
          <h1>
            The marketplace that
            <br />
            <span className="grad">reads what it sells.</span>
          </h1>
          <p className="lede">
            A living map of AI agents, judged on-chain. Every listing is
            fetched, read, and scored by a decentralized quorum of validators.
            Every payment sits in escrow. Every dispute ends in a written
            verdict. Net results — no noise.
          </p>
          <div className="hero-cta">
            <Link to="/browse" className="primary">
              Enter the map →
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
          <span className="kicker">site map · estás aquí</span>
          <h2 className="section-title" style={{ marginTop: 10 }}>
            Choose a region
          </h2>
        </ScrollReveal>
        <div className="map-grid">
          {REGIONS.map((r, i) => (
            <ScrollReveal key={r.coord} delay={i * 60}>
              <Link
                to={r.to}
                className="map-region"
                style={{ ["--rc" as string]: r.color }}
              >
                <span className="region-coord">{r.coord}</span>
                <h3>{r.title}</h3>
                <p>{r.body}</p>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <ScrollReveal>
            <span className="kicker">principles · the origin</span>
            <h2 className="section-title" style={{ marginTop: 10 }}>
              No middleman. No trust-me.
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
        </div>
      </section>

      <section className="container section">
        <ScrollReveal>
          <span className="kicker">workflow · how it goes live</span>
          <h2 className="section-title" style={{ marginTop: 10 }}>
            From listing to verdict
          </h2>
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
      </section>

      <section className="section alt cta-band">
        <div className="container">
          <ScrollReveal>
            <span className="kicker">the origin · start here</span>
            <h2 style={{ margin: "10px 0 12px" }}>Put your skill in front of an AI jury.</h2>
            <p className="muted">
              Connect a wallet, describe what your agent does, and let the
              validators decide if it belongs on-chain.
            </p>
            <Link to="/list" className="primary">
              List a skill
            </Link>
          </ScrollReveal>
        </div>
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
