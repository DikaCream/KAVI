import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMarketplace } from "../context/MarketplaceContext";
import { parseGen } from "../lib/client";

type Errors = Partial<Record<"title" | "description" | "category" | "price" | "contentUrl", string>>;

const FIELDS = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "category", label: "Category" },
  { key: "price", label: "Price" },
  { key: "contentUrl", label: "Content URL" },
] as const;

/** Client-side mirror of the contract's own input bounds. */
function validateField(
  key: keyof Errors,
  value: string,
): string | undefined {
  const v = value.trim();
  switch (key) {
    case "title":
      if (v.length < 3) return "Title must be at least 3 characters.";
      if (v.length > 120) return "Title must be 120 characters or fewer.";
      return undefined;
    case "description":
      if (v.length < 50)
        return `Description must be at least 50 characters (${v.length}/50).`;
      if (v.length > 4000) return "Description must be 4000 characters or fewer.";
      return undefined;
    case "category":
      if (v.length < 3) return "Category must be at least 3 characters.";
      if (v.length > 40) return "Category must be 40 characters or fewer.";
      return undefined;
    case "price":
      if (!/^\d+(\.\d+)?$/.test(v)) return "Price must be a number, e.g. 25, 12.5, or 0 for free.";
      if (Number(v) > 100) return "Price must be 100 GEN or less.";
      return undefined;
    case "contentUrl":
      if (!/^https:\/\//i.test(v))
        return "Content URL must start with https://";
      if (/\s/.test(v)) return "Content URL cannot contain spaces.";
      const rest = v.replace(/^https:\/\//i, "").split(/[/?#]/)[0].toLowerCase();
      if (!rest.includes(".")) return "Content URL must be a public host, e.g. github.com.";
      const blocked = ["localhost", "127.", "10.", "192.168.", "169.254.", "metadata", ".local", ".internal"];
      if (blocked.some((b) => rest.includes(b)))
        return "Private, local, or metadata hosts are rejected.";
      return undefined;
  }
}

export default function ListSkill() {
  const { contract, wallet } = useMarketplace();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const validate = (): Errors => {
    const next: Errors = {};
    for (const f of FIELDS) {
      const msg = validateField(f.key, f.key === "price" ? price : f.key === "title" ? title : f.key === "description" ? description : f.key === "category" ? category : contentUrl);
      if (msg) next[f.key] = msg;
    }
    return next;
  };

  const handleBlur = (key: keyof Errors, value: string) => {
    setErrors((prev) => ({ ...prev, [key]: validateField(key, value) }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const next = validate();
    setErrors(next);
    const keys = Object.keys(next) as (keyof Errors)[];
    if (keys.length > 0) {
      // Move focus to the error summary so keyboard/screen-reader users
      // find the problems immediately (WCAG 3.3.1).
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
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
        "Skill submitted. AI validators are reviewing it now. Check your dashboard for the verdict.",
      );
      setTitle("");
      setDescription("");
      setCategory("");
      setPrice("");
      setContentUrl("");
      setErrors({});
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
        <form className="panel form" onSubmit={submit} noValidate>
          {Object.keys(errors).length > 0 && (
            <div
              className="error-summary"
              role="alert"
              tabIndex={-1}
              ref={summaryRef}
            >
              <h2>There is a problem</h2>
              <ul>
                {FIELDS.filter((f) => errors[f.key]).map((f) => (
                  <li key={f.key}>
                    <a href={`#${f.key}`}>
                      {errors[f.key]}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <label htmlFor="title">
            Title
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={(e) => handleBlur("title", e.target.value)}
              required
              minLength={3}
              maxLength={120}
              placeholder="e.g. Web scraping agent"
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? "title-error" : undefined}
            />
            {errors.title && (
              <span className="field-error" id="title-error">
                {errors.title}
              </span>
            )}
          </label>
          <label htmlFor="description">
            Description (what it does, in plain English)
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={(e) => handleBlur("description", e.target.value)}
              required
              minLength={50}
              maxLength={4000}
              rows={5}
              placeholder="Explain the skill's inputs, outputs, and what problem it solves…"
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={errors.description ? "description-error" : undefined}
            />
            {errors.description && (
              <span className="field-error" id="description-error">
                {errors.description}
              </span>
            )}
          </label>
          <label htmlFor="category">
            Category
            <input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              onBlur={(e) => handleBlur("category", e.target.value)}
              required
              minLength={3}
              maxLength={40}
              placeholder="automation, data, security…"
              aria-invalid={errors.category ? true : undefined}
              aria-describedby={errors.category ? "category-error" : undefined}
            />
            {errors.category && (
              <span className="field-error" id="category-error">
                {errors.category}
              </span>
            )}
          </label>
          <label htmlFor="price">
            Price (GEN, 0 for free)
            <input
              id="price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onBlur={(e) => handleBlur("price", e.target.value)}
              required
              inputMode="decimal"
              max={100}
              placeholder="e.g. 25, or 0 for free (max 100)"
              aria-invalid={errors.price ? true : undefined}
              aria-describedby={errors.price ? "price-error" : undefined}
            />
            {errors.price && (
              <span className="field-error" id="price-error">
                {errors.price}
              </span>
            )}
          </label>
          <label htmlFor="contentUrl">
            Content URL (public https:// where the skill content lives)
            <input
              id="contentUrl"
              value={contentUrl}
              onChange={(e) => setContentUrl(e.target.value)}
              onBlur={(e) => handleBlur("contentUrl", e.target.value)}
              required
              placeholder="https://github.com/you/skill/blob/main/SKILL.md"
              aria-invalid={errors.contentUrl ? true : undefined}
              aria-describedby={errors.contentUrl ? "contentUrl-error" : undefined}
            />
            {errors.contentUrl && (
              <span className="field-error" id="contentUrl-error">
                {errors.contentUrl}
              </span>
            )}
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
              equivalence principle, not by a single operator.
            </li>
          </ol>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Your content URL must be a public <code>https://</code> address.
            Local, private, or metadata hosts are rejected for security.
            Prices range from 0 (free) to 100 GEN.
          </p>
        </aside>
      </div>
    </div>
  );
}
