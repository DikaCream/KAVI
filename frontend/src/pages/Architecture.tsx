import { useState } from "react";
import { CONTRACT_ADDRESS, NETWORK } from "../config";

const ICONS: Record<string, React.ReactNode> = {
  submit: (
    <>
      <path d="M14 3v5h5" />
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M12 11v6" />
      <path d="M9 14h6" />
    </>
  ),
  fetch: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20z" />
    </>
  ),
  judge: (
    <>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
      <path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z" />
    </>
  ),
  compare: (
    <>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
    </>
  ),
  settle: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  card: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </>
  ),
  dispute: (
    <>
      <path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
};

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

const MODERATION = [
  {
    no: "01",
    icon: "submit",
    title: "Submit",
    body: "A creator calls submit_skill with a title, description, category, price and a public https content URL.",
  },
  {
    no: "02",
    icon: "fetch",
    title: "Fetch",
    body: "Every validator fetches the content URL via gl.nondet.web.render, the same source read independently.",
  },
  {
    no: "03",
    icon: "judge",
    title: "Judge",
    body: "An LLM call produces a JSON verdict {verdict, score, reason} for the listing.",
  },
  {
    no: "04",
    icon: "compare",
    title: "Compare",
    body: "Results are compared under an equivalence principle, not byte equality: same verdict, score in the same bucket of ten.",
  },
  {
    no: "05",
    icon: "settle",
    title: "Commit",
    body: "On APPROVE, a second consensus round pins the immutable content version: the exact text validators read plus its Keccak-256 hash, agreed byte-for-byte.",
  },
  {
    no: "06",
    icon: "card",
    title: "Activate",
    body: "The listing goes ACTIVE with its score only if that version was committed; REJECT stays REJECTED with the reason.",
  },
];

const ESCROW = [
  {
    no: "01",
    icon: "card",
    title: "Buy",
    body: "Buyer sends the exact price. The contract re-fetches the URL under consensus and only escrows if it still matches the approved content version.",
  },
  {
    no: "02",
    icon: "settle",
    title: "Accept",
    body: "Buyer releases early, or anyone releases after the 7-day window.",
  },
  {
    no: "03",
    icon: "dispute",
    title: "Dispute",
    body: "Within the escrow window, the buyer opens a dispute with a written complaint. This starts a separate 24-hour evidence window.",
  },
  {
    no: "04",
    icon: "compare",
    title: "Evidence",
    body: "Before validator review, buyer and creator may each submit one structured record: fixed type, a Keccak-256 artifact hash, canonical on-chain reference, and raw details stored in the dispute. The signed transaction authenticates its author.",
  },
  {
    no: "05",
    icon: "judge",
    title: "Adjudicate",
    body: "After both submissions or the 24-hour evidence deadline, anyone can start validator review. Failed reviews remain OPEN and can be retried.",
  },
  {
    no: "06",
    icon: "card",
    title: "Settle",
    body: "Validators judge the committed content version and authenticated evidence, then settle_dispute pays a FULL/PARTIAL refund or the creator.",
  },
];

function StepGrid({ steps }: { steps: (typeof MODERATION)[number][] }) {
  return (
    <div className="arch-steps">
      {steps.map((s) => (
        <div className="step-card" key={s.title}>
          <div className="step-no">{s.no}</div>
          <div className="step-icon">
            <Icon name={s.icon} />
          </div>
          <h3>{s.title}</h3>
          <p>{s.body}</p>
        </div>
      ))}
    </div>
  );
}

export default function Architecture() {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (!CONTRACT_ADDRESS) return;
    try {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="container page">
      <div className="page-head">
        <span className="kicker">~/architecture · how consensus works</span>
        <h1 style={{ marginTop: 8 }}>Architecture</h1>
        <p className="muted">
          How KAVI uses GenLayer's AI-validator consensus instead of trusting a
          single operator.
        </p>
      </div>

      <section className="panel arch-hero">
        <h2>Optimistic democracy</h2>
        <p style={{ margin: "0 0 4px" }}>
          GenLayer resolves transactions that require <em>judgment</em>, not
          just deterministic code. A leader proposes a result, independent
          validators, each running possibly different LLMs, evaluate it, and
          only results the validators agree on are accepted into finality.
        </p>
        <p className="muted">
          This is why the marketplace can do things a normal EVM contract
          cannot: read a web page, judge whether a listing is honest, and rule
          on a refund based on <em>meaning</em> rather than exact bytes.
        </p>
        <div className="chips">
          <span className="chip">1 leader proposes</span>
          <span className="chip">n validators evaluate</span>
          <span className="chip">equivalence, not byte-equality</span>
          <span className="chip">consensus → finality</span>
        </div>
      </section>

      <h2 className="section-title">Listing moderation</h2>
      <StepGrid steps={MODERATION} />

      <h2 className="section-title">Escrow & dispute</h2>
      <StepGrid steps={ESCROW} />

      <h2 className="section-title">Equivalence principles</h2>
      <div className="eq-grid">
        <div className="eq-card">
          <h3>
            <span className="step-icon" style={{ width: 30, height: 30 }}>
              <Icon name="judge" size={16} />
            </span>
            Moderation
          </h3>
          <p className="muted" style={{ margin: 0 }}>
            Two validators won't word an LLM answer identically, so verdicts
            are compared by rule, not string:
          </p>
          <div className="rule">
            verdicts match exactly
            <br />+ scores in the same bucket of ten
            <br />+ reason may differ in wording
          </div>
        </div>
        <div className="eq-card">
          <h3>
            <span className="step-icon" style={{ width: 30, height: 30 }}>
              <Icon name="compare" size={16} />
            </span>
            Adjudication
          </h3>
          <p className="muted" style={{ margin: 0 }}>
            Refund rulings are compared the same way: agreement on the
            outcome, not the exact percentage.
          </p>
          <div className="rule">
            both refunds zero, or both non-zero
            <br />+ refund_pct in the same bucket of ten
          </div>
        </div>
        <div className="eq-card">
          <h3>
            <span className="step-icon" style={{ width: 30, height: 30 }}>
              <Icon name="card" size={16} />
            </span>
            Content version
          </h3>
          <p className="muted" style={{ margin: 0 }}>
            The immutable content version is committed under a stricter rule:
            validators must compute the exact same Keccak-256 hash.
          </p>
          <div className="rule">
            content_hash matches byte-for-byte
            <br />+ snapshot text stored on-chain
          </div>
        </div>
      </div>

      <section className="panel" style={{ marginTop: 22 }}>
        <h2>Defensive LLM handling</h2>
        <p className="muted" style={{ margin: 0 }}>
          Untrusted text (titles, descriptions, fetched content, complaints)
          is fenced and neutralized so a hostile listing cannot inject
          instructions into the moderator or arbitrator.
        </p>
      </section>

      <section className="panel" style={{ marginTop: 22 }}>
        <h2>Deployed contract</h2>
        <div className="code-box">
          <span className="addr">{CONTRACT_ADDRESS || "not configured"}</span>
          {CONTRACT_ADDRESS && (
            <button className="ghost small" onClick={copyAddress}>
              {copied ? "Copied ✓" : "Copy"}
            </button>
          )}
        </div>
        <p className="muted" style={{ margin: "12px 0 0" }}>
          Network: <strong style={{ color: "var(--green)" }}>{NETWORK}</strong>
          {" · "}
          {CONTRACT_ADDRESS && (
            <a
              href={`https://explorer-studio.genlayer.com/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
            >
              view on explorer ↗
            </a>
          )}
        </p>
      </section>
    </div>
  );
}
