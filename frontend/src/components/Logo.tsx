interface LogoProps {
  size?: number;
  withWordmark?: boolean;
}

/**
 * Brand mark: a hexagonal "consensus node" — one core connected to three
 * satellite validators — referencing how GenLayer's AI validators agree.
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
            <stop offset="0" stopColor="#6ee7b7" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        <path
          d="M16 2 L27 8.5 V23 L16 29.5 L5 23 V8.5 Z"
          stroke="url(#lg-brand)"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M16 5 L24.5 10 L16 15 L7.5 10 Z"
          stroke="url(#lg-brand)"
          strokeWidth="1.2"
          opacity="0.5"
        />
        <circle cx="16" cy="15.5" r="4" fill="url(#lg-brand)" />
        <circle cx="16" cy="5" r="2" fill="#6ee7b7" />
        <circle cx="24.5" cy="10" r="2" fill="#a78bfa" />
        <circle cx="7.5" cy="10" r="2" fill="#7dd3fc" />
      </svg>
      {withWordmark && (
        <span className="logo-word">
          AI<span>Marketplace</span>
        </span>
      )}
    </span>
  );
}
