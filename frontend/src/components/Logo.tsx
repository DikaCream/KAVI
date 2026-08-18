interface LogoProps {
  size?: number;
  withWordmark?: boolean;
}

/**
 * Brand mark: a marketplace "listing card" (purple squircle) holding an AI
 * spark, with a green escrow coin on the corner — the product's three ideas:
 * a listing, the AI behind it, and the money held in escrow.
 */
export default function Logo({ size = 30, withWordmark = true }: LogoProps) {
  return (
    <span className="logo" style={{ gap: 10 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="lg-brand" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#6d28d9" />
          </linearGradient>
        </defs>
        {/* listing card */}
        <rect x="4" y="4" width="24" height="24" rx="7" fill="url(#lg-brand)" />
        <rect
          x="6.5"
          y="6.5"
          width="19"
          height="19"
          rx="5.5"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1"
        />
        {/* AI spark */}
        <path
          d="M16 7.8c.55 3.4 2.8 5.65 6.2 6.2-3.4.55-5.65 2.8-6.2 6.2-.55-3.4-2.8-5.65-6.2-6.2 3.4-.55 5.65-2.8 6.2-6.2Z"
          fill="#f4f1ea"
        />
        {/* escrow coin */}
        <circle cx="24" cy="24" r="3.4" fill="#34d399" />
        <circle cx="24" cy="24" r="1.4" fill="#0e0b16" opacity="0.9" />
      </svg>
      {withWordmark && (
        <span className="logo-word">
          AI<span>Marketplace</span>
        </span>
      )}
    </span>
  );
}
