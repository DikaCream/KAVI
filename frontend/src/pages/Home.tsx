import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AnimatedNumber from "../components/AnimatedNumber";
import OrbField from "../components/OrbField";
import ScrollReveal from "../components/ScrollReveal";
import { useMarketplace } from "../context/MarketplaceContext";

const REGIONS = [
  {
    coord: "~/browse",
    title: "Browse",
    body: "Every approved skill on-chain, scored by validators.",
    to: "/browse",
    color: "#22d3ee",
  },
  {
    coord: "~/list",
    title: "List a skill",
    body: "Submit your agent for validator review.",
    to: "/list",
    color: "#a855f7",
  },
  {
    coord: "~/dashboard",
    title: "Dashboard",
    body: "Your listings, sales, and locked escrow.",
    to: "/dashboard",
    color: "#a3e635",
  },
  {
    coord: "~/architecture",
    title: "Architecture",
    body: "How the AI validators reach consensus.",
    to: "/architecture",
    color: "#e879f9",
  },
  {
    coord: "~/dispute",
    title: "Dispute",
    body: "Let the AI jury rule on a refund.",
    to: "/architecture",
    color: "#fb7185",
  },
];

const FEATURES = [
  {
    icon: "eye",
    title: "AI reads every listing",
    body: "Validators fetch your content URL and check it actually does what the listing claims. Spam, scams, and prompt-injection never make it on-chain.",
  },
  {
    icon: "scale",
    title: "Disputes judged by validators",
    body: "A misleading listing goes to a decentralized AI tribunal that rules a full, partial, or no refund, and writes down why.",
  },
  {
    icon: "lock",
    title: "Escrow, not promises",
    body: "Payment is locked per-purchase. The seller gets paid only when you accept delivery, or when the escrow window closes.",
  },
  {
    icon: "target",
    title: "Quality you can compare",
    body: "Approved skills carry a consensus score from 0–100, so you can tell a polished agent from a rough one before paying.",
  },
];

const ICON_PATHS: Record<string, React.ReactNode> = {
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  scale: (
    <>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </>
  ),
  lock: (
    <>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
};

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
        <OrbField />
        <div className="container">
          <span className="eyebrow">
            <span className="pulse" />
            ~/manifesto · you are here
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
            verdict. Net results, no noise.
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
          <span className="kicker">site map · you are here</span>
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
                  <div className="icon" aria-hidden="true">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {ICON_PATHS[f.icon]}
                    </svg>
                  </div>
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
