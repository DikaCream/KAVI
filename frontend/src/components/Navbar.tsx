import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import Logo from "./Logo";
import WalletButton from "./WalletButton";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/browse", label: "Browse" },
  { to: "/list", label: "List a skill" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/architecture", label: "Architecture" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <nav className="navbar">
      <Link to="/" aria-label="AI Marketplace home">
        <Logo />
      </Link>

      <div
        id="site-nav"
        className={`nav-links ${open ? "open" : ""}`}
        aria-label="Primary"
      >
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }: { isActive: boolean }) =>
              isActive ? "active" : ""
            }
          >
            {l.label}
          </NavLink>
        ))}
      </div>

      <div className="spacer" />

      <WalletButton />
      <button
        className="hamburger"
        aria-label="Toggle menu"
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "✕" : "☰"}
      </button>
    </nav>
  );
}
