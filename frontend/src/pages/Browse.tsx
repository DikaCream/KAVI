import { useCallback, useEffect, useMemo, useState } from "react";
import SkillCard from "../components/SkillCard";
import { useMarketplace } from "../context/MarketplaceContext";
import type { Skill } from "../lib/types";

export default function Browse() {
  const { contract } = useMarketplace();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const refresh = useCallback(async () => {
    try {
      const list = await contract.listSkills(0, 50);
      setSkills(list.filter((s) => s.status === "ACTIVE"));
    } catch {
      /* leave empty on error */
    } finally {
      setLoading(false);
    }
  }, [contract]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const categories = useMemo(
    () => Array.from(new Set(skills.map((s) => s.category))).sort(),
    [skills],
  );

  const filtered = skills.filter((s) => {
    const q = query.toLowerCase();
    if (q && !`${s.title} ${s.category} ${s.description}`.toLowerCase().includes(q)) {
      return false;
    }
    if (category && s.category !== category) return false;
    return true;
  });

  return (
    <div className="container page">
      <div className="page-head">
        <span className="kicker">~/browse · on-chain listings</span>
        <h1 style={{ marginTop: 8 }}>Browse skills</h1>
        <p className="muted">
          Every listing below was read and approved by GenLayer's AI validators.
        </p>
      </div>

      <div className="toolbar">
        <input
          placeholder="Search skills, categories, descriptions…"
          aria-label="Search skills"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="empty">Loading skills…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          {skills.length === 0
            ? "No live skills yet. Be the first to list one."
            : "No skills match your filters."}
        </div>
      ) : (
        <div className="grid">
          {filtered.map((s) => (
            <SkillCard key={s.id} skill={s} />
          ))}
        </div>
      )}
    </div>
  );
}
