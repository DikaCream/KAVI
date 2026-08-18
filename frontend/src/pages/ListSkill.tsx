import { useState } from "react";
import { Link } from "react-router-dom";
import { useMarketplace } from "../context/MarketplaceContext";
import { parseGen } from "../lib/client";

export default function ListSkill() {
  const { contract, wallet } = useMarketplace();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!wallet.address) {
      setError("Connect your wallet to list a skill.");
      return;
    }
    setSubmitting(true);
    try {
      const hash = await contract.submitSkill(
        title.trim(),
        description.trim(),
        category.trim(),
        parseGen(price),
        contentUrl.trim(),
      );
      await contract.waitForReceipt(hash, 60, 4000);
      setNotice(
        "Skill submitted. AI validators are reviewing it now — check your dashboard for the verdict.",
      );
      setTitle("");
      setDescription("");
      setCategory("");
      setPrice("");
      setContentUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container page narrow">
      <div className="page-head">
        <span className="kicker">~/list · submit for review</span>
        <h1 style={{ marginTop: 8 }}>List an AI skill</h1>
        <p className="muted">
          Describe what your skill does and link its public content. GenLayer's
          validators read it and decide whether it goes live.
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {notice && (
        <div className="notice">
          {notice}{" "}
          <Link to="/dashboard" style={{ fontWeight: 600 }}>
            View dashboard →
          </Link>
        </div>
      )}

      <div className="grid two-col">
        <form className="panel form" onSubmit={submit}>
          <label>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={120}
              placeholder="e.g. Web scraping agent"
            />
          </label>
          <label>
            Description (what it does, in plain English)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={50}
              maxLength={4000}
              rows={5}
              placeholder="Explain the skill's inputs, outputs, and what problem it solves…"
            />
          </label>
          <label>
            Category
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              minLength={3}
              maxLength={40}
              placeholder="automation, data, security…"
            />
          </label>
          <label>
            Price (GEN)
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              pattern="[0-9]+(\.[0-9]+)?"
              placeholder="e.g. 50"
            />
          </label>
          <label>
            Content URL (public https:// where the skill content lives)
            <input
              value={contentUrl}
              onChange={(e) => setContentUrl(e.target.value)}
              required
              placeholder="https://github.com/you/skill/blob/main/SKILL.md"
            />
          </label>
          <button
            className="primary"
            type="submit"
            disabled={submitting || !wallet.address}
          >
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </form>

        <aside className="panel">
          <h3>What happens after you submit</h3>
          <ol className="muted checklist">
            <li>
              Validators fetch your <code>content_url</code> and read it.
            </li>
            <li>
              They check the content matches your title and description, and
              reject spam, scams, or prompt-injection.
            </li>
            <li>
              An approved listing goes live with a 0–100 quality score; a
              rejected one is marked <em>Rejected</em> with the reason.
            </li>
            <li>
              The verdict is settled by AI-validator consensus under an
              equivalence principle — not by a single operator.
            </li>
          </ol>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Your content URL must be a public <code>https://</code> address.
            Local, private, or metadata hosts are rejected for security.
          </p>
        </aside>
      </div>
    </div>
  );
}
