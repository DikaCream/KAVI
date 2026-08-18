import { useCallback, useEffect, useMemo, useState } from "react";
import { CONTRACT_ADDRESS } from "./config";
import { createMarketplaceClient, formatAddress, formatGen } from "./lib/client";
import { Marketplace } from "./lib/contract";
import { useWallet } from "./hooks/useWallet";
import type { Purchase, Skill } from "./lib/types";

type Tab = "browse" | "submit" | "my-skills" | "my-purchases";

const TABS: { id: Tab; label: string }[] = [
  { id: "browse", label: "Browse" },
  { id: "submit", label: "List a skill" },
  { id: "my-skills", label: "My skills" },
  { id: "my-purchases", label: "My purchases" },
];

export default function App() {
  const wallet = useWallet();
  const [tab, setTab] = useState<Tab>("browse");
  const [selectedSkill, setSelectedSkill] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(
    () => createMarketplaceClient(wallet.address),
    [wallet.address],
  );
  const contract = useMemo(() => new Marketplace(client), [client]);

  return (
    <>
      <nav className="navbar">
        <div className="brand">
          AI<span>Marketplace</span>
        </div>
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "active" : ""}
              onClick={() => {
                setTab(t.id);
                setSelectedSkill(null);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <WalletBadge
          address={wallet.address}
          hasProvider={wallet.hasProvider}
          busy={wallet.busy}
          onConnect={wallet.connect}
        />
      </nav>

      <main className="container">
        {!CONTRACT_ADDRESS && (
          <div className="error-banner">
            Contract address is not configured. Set <code>VITE_CONTRACT_ADDRESS</code> in{" "}
            <code>frontend/.env</code>.
          </div>
        )}

        {error && (
          <div className="error-banner">
            {error}
            <button style={{ marginLeft: 12 }} onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        {notice && (
          <div className="notice" style={{ marginBottom: 16 }}>
            {notice}
            <button style={{ marginLeft: 12 }} onClick={() => setNotice(null)}>
              OK
            </button>
          </div>
        )}

        {tab === "browse" && (
          <Browse
            contract={contract}
            wallet={wallet.address}
            selectedSkill={selectedSkill}
            onSelect={setSelectedSkill}
            onNotice={setNotice}
            onError={setError}
          />
        )}
        {tab === "submit" && (
          <SubmitSkill
            contract={contract}
            wallet={wallet.address}
            onNotice={setNotice}
            onError={setError}
          />
        )}
        {tab === "my-skills" && (
          <MySkills contract={contract} wallet={wallet.address} />
        )}
        {tab === "my-purchases" && (
          <MyPurchases
            contract={contract}
            wallet={wallet.address}
            onNotice={setNotice}
            onError={setError}
          />
        )}
      </main>
    </>
  );
}

function WalletBadge(props: {
  address: string | null;
  hasProvider: boolean;
  busy: boolean;
  onConnect: () => void;
}) {
  if (props.address) {
    return (
      <div className="row" style={{ gap: 10, alignItems: "center" }}>
        <span className="badge active">{formatAddress(props.address)}</span>
      </div>
    );
  }
  if (!props.hasProvider) {
    return <span className="muted">Install MetaMask</span>;
  }
  return (
    <button className="primary" onClick={props.onConnect} disabled={props.busy}>
      {props.busy ? "Connecting…" : "Connect wallet"}
    </button>
  );
}

/* ---------------------------------------------------------------- Browse */

function Browse(props: {
  contract: Marketplace;
  wallet: string | null;
  selectedSkill: number | null;
  onSelect: (id: number | null) => void;
  onNotice: (m: string) => void;
  onError: (m: string) => void;
}) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    try {
      const list = await props.contract.listSkills(0, 50);
      setSkills(list.filter((s) => s.status === "ACTIVE"));
    } catch {
      /* empty state */
    } finally {
      setLoading(false);
    }
  }, [props.contract]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = skills.filter((s) => {
    const q = query.toLowerCase();
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
    );
  });

  if (props.selectedSkill != null) {
    return (
      <SkillDetail
        contract={props.contract}
        wallet={props.wallet}
        skillId={props.selectedSkill}
        onBack={() => props.onSelect(null)}
        onNotice={props.onNotice}
        onError={props.onError}
        onPurchased={refresh}
      />
    );
  }

  return (
    <div>
      <input
        placeholder="Search skills…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 20, maxWidth: 360 }}
      />
      {loading ? (
        <div className="muted">Loading skills…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          No live skills yet. Connect a wallet and list the first one.
        </div>
      ) : (
        <div className="grid">
          {filtered.map((s) => (
            <div className="card" key={s.id}>
              <div className="row">
                <h3>{s.title}</h3>
                <span className="score">{s.score}/100</span>
              </div>
              <span className="badge">{s.category}</span>
              <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
                {s.description.slice(0, 120)}
                {s.description.length > 120 ? "…" : ""}
              </p>
              <div className="row" style={{ marginTop: "auto" }}>
                <strong>{formatGen(s.price)}</strong>
                <button onClick={() => props.onSelect(s.id)}>View</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Skill detail */

function SkillDetail(props: {
  contract: Marketplace;
  wallet: string | null;
  skillId: number;
  onBack: () => void;
  onNotice: (m: string) => void;
  onError: (m: string) => void;
  onPurchased: () => void;
}) {
  const [skill, setSkill] = useState<Skill | null>(null);
  const [buying, setBuying] = useState(false);

  const refresh = useCallback(async () => {
    const s = await props.contract.getSkill(props.skillId);
    setSkill(s);
  }, [props.contract, props.skillId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!skill) return <div className="muted">Loading…</div>;

  const buy = async () => {
    if (!props.wallet) {
      props.onError("Connect your wallet to buy this skill.");
      return;
    }
    setBuying(true);
    try {
      const hash = await props.contract.purchaseSkill(skill.id, skill.price);
      await props.contract.waitForReceipt(hash);
      props.onNotice("Purchase confirmed. Funds are now held in escrow.");
      props.onPurchased();
    } catch (e: any) {
      props.onError(e?.message ?? "Purchase failed.");
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="panel">
      <button onClick={props.onBack} style={{ marginBottom: 16 }}>
        ← Back to browse
      </button>
      <div className="row">
        <h2 style={{ margin: 0 }}>{skill.title}</h2>
        <span className="score">{skill.score}/100</span>
      </div>
      <span className="badge">{skill.category}</span>
      <p>{skill.description}</p>

      <div className="notice" style={{ margin: "16px 0" }}>
        <strong>AI moderation review</strong>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          {skill.review_summary || "No review summary available."}
        </p>
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        <strong style={{ fontSize: "1.25rem" }}>{formatGen(skill.price)}</strong>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={skill.content_url} target="_blank" rel="noreferrer">
            <button>View content</button>
          </a>
          <button className="primary" onClick={buy} disabled={buying || !props.wallet}>
            {buying ? "Buying…" : "Buy"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Submit */

function SubmitSkill(props: {
  contract: Marketplace;
  wallet: string | null;
  onNotice: (m: string) => void;
  onError: (m: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!props.wallet) {
      props.onError("Connect your wallet to list a skill.");
      return;
    }
    setSubmitting(true);
    try {
      const hash = await props.contract.submitSkill(
        title.trim(),
        description.trim(),
        category.trim(),
        Number(price),
        contentUrl.trim(),
      );
      await props.contract.waitForReceipt(hash, 60, 4000);
      props.onNotice(
        "Skill submitted. AI validators are reviewing it — check My skills for the verdict.",
      );
      setTitle("");
      setDescription("");
      setCategory("");
      setPrice("");
      setContentUrl("");
    } catch (e: any) {
      props.onError(e?.message ?? "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>List an AI skill</h2>
      <p className="muted">
        Validators fetch your content URL, check it matches the description, and score
        it before it goes live.
      </p>
      <form className="form" onSubmit={submit}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={120} />
        </label>
        <label>
          Description (what the skill does, in plain English)
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required minLength={50} maxLength={4000} rows={5} />
        </label>
        <label>
          Category
          <input value={category} onChange={(e) => setCategory(e.target.value)} required minLength={3} maxLength={40} placeholder="automation, data, security…" />
        </label>
        <label>
          Price (GEN)
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required min={1} />
        </label>
        <label>
          Content URL (public https:// where the skill content lives)
          <input value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} required placeholder="https://github.com/you/skill/blob/main/SKILL.md" />
        </label>
        <button className="primary" type="submit" disabled={submitting || !props.wallet}>
          {submitting ? "Submitting…" : "Submit for review"}
        </button>
      </form>
    </div>
  );
}

/* -------------------------------------------------------------- My skills */

function MySkills(props: { contract: Marketplace; wallet: string | null }) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(async () => {
    if (!props.wallet) return setSkills([]);
    const list = await props.contract.listCreatorSkills(props.wallet, 0, 50);
    setSkills(list);
  }, [props.contract, props.wallet]);

  useEffect(() => {
    refresh();
  }, [refresh, tick]);

  // Poll while any skill is pending review.
  useEffect(() => {
    if (!skills.some((s) => s.status === "PENDING_REVIEW")) return;
    const id = setInterval(() => setTick((t) => t + 1), 6000);
    return () => clearInterval(id);
  }, [skills]);

  if (!props.wallet) return <div className="empty">Connect your wallet to see your skills.</div>;
  if (skills.length === 0) return <div className="empty">You haven't listed any skills yet.</div>;

  return (
    <div className="grid">
      {skills.map((s) => (
        <div className="card" key={s.id}>
          <div className="row">
            <h3>{s.title}</h3>
            <StatusBadge status={s.status} />
          </div>
          <span className="badge">{s.category}</span>
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {formatGen(s.price)} · score {s.score}/100
          </div>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            {s.purchases} sales · {formatGen(s.revenue)} earned · {s.refunds} refunds
          </div>
          {s.status === "REJECTED" && s.review_summary && (
            <div className="muted" style={{ fontSize: "0.85rem" }}>
              “{s.review_summary}”
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ My purchases */

function MyPurchases(props: {
  contract: Marketplace;
  wallet: string | null;
  onNotice: (m: string) => void;
  onError: (m: string) => void;
}) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [tick, setTick] = useState(0);
  const [disputing, setDisputing] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const refresh = useCallback(async () => {
    if (!props.wallet) return setPurchases([]);
    const list = await props.contract.listBuyerPurchases(props.wallet, 0, 50);
    setPurchases(list);
  }, [props.contract, props.wallet]);

  useEffect(() => {
    refresh();
  }, [refresh, tick]);

  const run = async (fn: () => Promise<string>, ok: string) => {
    try {
      const hash = await fn();
      await props.contract.waitForReceipt(hash);
      props.onNotice(ok);
      setTick((t) => t + 1);
    } catch (e: any) {
      props.onError(e?.message ?? "Transaction failed.");
    }
  };

  if (!props.wallet) return <div className="empty">Connect your wallet to see your purchases.</div>;
  if (purchases.length === 0) return <div className="empty">You haven't bought anything yet.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {purchases.map((p) => (
        <PurchaseRow
          key={p.id}
          purchase={p}
          contract={props.contract}
          onAccept={() =>
            run(() => props.contract.releasePurchase(p.id), "Purchase accepted — escrow released to the creator.")
          }
          onDispute={() => {
            setDisputing(p.id);
            setReason("");
          }}
        />
      ))}

      {disputing != null && (
        <div className="panel" style={{ borderColor: "var(--danger)" }}>
          <h3 style={{ marginTop: 0 }}>File a dispute for purchase #{disputing}</h3>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain what the skill does not deliver compared to its listing (50+ chars)…"
            rows={4}
            minLength={50}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button
              className="danger"
              disabled={reason.trim().length < 50}
              onClick={() =>
                run(async () => {
                  const h = await props.contract.fileDispute(disputing, reason.trim());
                  setDisputing(null);
                  return h;
                }, "Dispute filed — AI validators are adjudicating it.")
              }
            >
              Submit dispute
            </button>
            <button onClick={() => setDisputing(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PurchaseRow(props: {
  purchase: Purchase;
  contract: Marketplace;
  onAccept: () => void;
  onDispute: () => void;
}) {
  const { purchase: p } = props;
  const [dispute, setDispute] = useState<any>(null);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    if (p.dispute_id) {
      props.contract.getDispute(p.dispute_id).then(setDispute);
    }
  }, [p.dispute_id, props.contract]);

  const settle = async () => {
    setSettling(true);
    try {
      const hash = await props.contract.settleDispute(p.dispute_id);
      await props.contract.waitForReceipt(hash);
    } finally {
      setSettling(false);
    }
  };

  return (
    <div className="card">
      <div className="row">
        <strong>Purchase #{p.id}</strong>
        <span className={`badge ${p.status.toLowerCase()}`}>{p.status}</span>
      </div>
      <div className="muted" style={{ fontSize: "0.9rem" }}>
        Skill #{p.skill_id} · {formatGen(p.price)}
      </div>

      {p.status === "ESCROWED" && (
        <div className="row" style={{ marginTop: 10 }}>
          <button className="primary" onClick={props.onAccept}>
            Accept & release
          </button>
          <button className="danger" onClick={props.onDispute}>
            File dispute
          </button>
        </div>
      )}

      {p.status === "DISPUTED" && dispute && (
        <div className="notice" style={{ marginTop: 10 }}>
          <div className="row">
            <strong>Dispute #{dispute.id}</strong>
            <span className={`badge ${dispute.status.toLowerCase()}`}>{dispute.status}</span>
          </div>
          {dispute.outcome ? (
            <>
              <div className="muted">
                Outcome: <strong>{dispute.outcome.replace("_", " ")}</strong> ({dispute.refund_pct}%)
              </div>
              {dispute.verdict_reason && (
                <div className="muted" style={{ fontSize: "0.85rem" }}>
                  “{dispute.verdict_reason}”
                </div>
              )}
              <button onClick={settle} disabled={settling} style={{ marginTop: 10 }}>
                {settling ? "Settling…" : "Settle dispute"}
              </button>
            </>
          ) : (
            <div className="muted">Awaiting validators…</div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge(props: { status: string }) {
  const cls = props.status === "ACTIVE" ? "active" : props.status === "REJECTED" ? "rejected" : "pending";
  return <span className={`badge ${cls}`}>{props.status}</span>;
}
