import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="container page notfound">
      <span className="kicker">~/404 · region not found</span>
      <h1 className="notfound-code" style={{ marginTop: 16 }}>
        404
      </h1>
      <p className="muted" style={{ maxWidth: 420, margin: "0 auto 24px" }}>
        This coordinate does not exist on the KAVI map. The page may have
        moved, or you followed a broken link.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <Link to="/" className="primary">
          Back to home
        </Link>
        <Link to="/browse" className="ghost">
          Browse skills
        </Link>
      </div>
    </div>
  );
}
