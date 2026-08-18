/**
 * Floating gradient orbs (ChatXBT-style): soft blurred color blobs that drift
 * behind the hero. Purely decorative; disabled under prefers-reduced-motion
 * via CSS.
 */
export default function OrbField() {
  return (
    <div className="orb-field" aria-hidden="true">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
    </div>
  );
}
