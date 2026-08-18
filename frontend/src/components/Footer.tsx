import { Link } from "react-router-dom";
import { CONTRACT_ADDRESS } from "../config";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="brand">
            AI<span>Marketplace</span>
          </div>
          <p className="muted" style={{ maxWidth: 360 }}>
            An on-chain marketplace for AI skills, moderated and adjudicated by
            GenLayer's AI validators.
          </p>
        </div>
        <div className="footer-col">
          <strong>Explore</strong>
          <Link to="/browse">Browse skills</Link>
          <Link to="/architecture">Architecture</Link>
        </div>
        <div className="footer-col">
          <strong>Network</strong>
          <a href="https://genlayer.com" target="_blank" rel="noreferrer">
            GenLayer
          </a>
          <a href="https://docs.genlayer.com" target="_blank" rel="noreferrer">
            Docs
          </a>
        </div>
        <div className="footer-col">
          <strong>Contract</strong>
          {CONTRACT_ADDRESS ? (
            <a
              href={`https://explorer-studio.genlayer.com/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="mono"
            >
              {CONTRACT_ADDRESS.slice(0, 10)}…{CONTRACT_ADDRESS.slice(-6)}
            </a>
          ) : (
            <span className="muted">Not configured</span>
          )}
        </div>
      </div>
    </footer>
  );
}
