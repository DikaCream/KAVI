import { NavLink } from "react-router-dom";
import WalletButton from "./WalletButton";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/browse", label: "Browse" },
  { to: "/list", label: "List a skill" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/architecture", label: "Architecture" },
];

export default function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/" className="brand">
        AI<span>Marketplace</span>
      </NavLink>
      <div className="nav-links">
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
    </nav>
  );
}
