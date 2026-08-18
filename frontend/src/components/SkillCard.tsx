import { Link } from "react-router-dom";
import { formatGen } from "../lib/client";
import type { Skill } from "../lib/types";

export default function SkillCard({ skill }: { skill: Skill }) {
  return (
    <Link to={`/skill/${skill.id}`} className="card skill-card">
      <div className="row">
        <h3>{skill.title}</h3>
        <span className="score">{skill.score}/100</span>
      </div>
      <span className="badge">{skill.category}</span>
      <p className="muted clamp" style={{ margin: 0, fontSize: "0.9rem" }}>
        {skill.description}
      </p>
      <div className="row" style={{ marginTop: "auto" }}>
        <strong className="price">{formatGen(skill.price)}</strong>
        <span className="muted" style={{ fontSize: "0.8rem" }}>
          {skill.purchases} sold
        </span>
      </div>
    </Link>
  );
}
