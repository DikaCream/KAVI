import { CONTRACT_ADDRESS, NETWORK } from "../config";

const FLOW = [
  {
    title: "1 · Submit",
    body: "A creator calls submit_skill with a title, description, category, price and a public https content URL.",
  },
  {
    title: "2 · Fetch",
    body: "Every validator fetches the content URL via gl.nondet.web.render — the same source, read independently.",
  },
  {
    title: "3 · Judge",
    body: "An LLM call produces a JSON verdict {verdict, score, reason} for the listing.",
  },
  {
    title: "4 · Compare",
    body: "Results are compared under an equivalence principle, not byte equality: same verdict, score in the same bucket of ten.",
  },
  {
    title: "5 · Settle",
    body: "The accepted verdict is written on-chain: APPROVE → ACTIVE with score, REJECT → REJECTED with the reason.",
  },
];

const ESCROW_FLOW = [
  { title: "Buy", body: "Buyer sends the exact price; funds are locked in per-purchase escrow." },
  { title: "Accept", body: "Buyer releases early, or anyone releases after the 7-day window." },
  { title: "Dispute", body: "Within the window, the buyer can open a dispute with a written complaint." },
  { title: "Adjudicate", body: "Validators compare the listing vs content vs complaint and rule a refund percentage." },
  { title: "Settle", body: "settle_dispute pays FULL/PARTIAL refund to the buyer or the remainder to the creator." },
];

export default function Architecture() {
  return (
    <div className="container page">
      <div className="page-head">
        <span className="kicker">~/architecture · how consensus works</span>
        <h1 style={{ marginTop: 8 }}>Architecture</h1>
        <p className="muted">
          How AI Marketplace uses GenLayer's AI-validator consensus instead of
          trusting a single operator.
        </p>
      </div>

      <section className="panel">
        <h2>Optimistic democracy</h2>
        <p>
          GenLayer resolves transactions that require <em>judgment</em>, not
          just deterministic code. A leader proposes a result, independent
          validators — each running possibly different LLMs — evaluate it, and
          only results the validators agree on are accepted into finality.
        </p>
        <p className="muted">
          This is why the marketplace can do things a normal EVM contract
          cannot: read a web page, judge whether a listing is honest, and rule
          on a refund based on <em>meaning</em> rather than exact bytes.
        </p>
      </section>

      <h2 className="section-title">Listing moderation</h2>
      <ol className="flow">
        {FLOW.map((f) => (
          <li key={f.title}>
            <strong>{f.title}</strong>
            <p className="muted">{f.body}</p>
          </li>
        ))}
      </ol>

      <h2 className="section-title">Escrow & dispute</h2>
      <ol className="flow">
        {ESCROW_FLOW.map((f) => (
          <li key={f.title}>
            <strong>{f.title}</strong>
            <p className="muted">{f.body}</p>
          </li>
        ))}
      </ol>

      <section className="panel">
        <h2>Equivalence principles</h2>
        <p>
          Two honest validators won't word an LLM answer identically, so the
          contract compares results with custom rules:
        </p>
        <ul className="muted">
          <li>
            <strong>Moderation</strong> — verdicts must match exactly; scores
            must fall in the same bucket of ten. Wording of the reason may
            differ.
          </li>
          <li>
            <strong>Adjudication</strong> — refund percentages must both be zero
            or both non-zero, and in the same bucket of ten.
          </li>
        </ul>
        <p className="muted">
          Untrusted text (titles, descriptions, fetched content, complaints) is
          fenced and neutralized so a hostile listing cannot inject
          instructions into the moderator or arbitrator.
        </p>
      </section>

      <section className="panel">
        <h2>Deployed contract</h2>
        <p className="mono">{CONTRACT_ADDRESS || "not configured"}</p>
        <p className="muted">
          Network: {NETWORK} ·{" "}
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
