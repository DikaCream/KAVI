function tone(status: string): string {
  switch (status) {
    case "ACTIVE":
    case "RELEASED":
    case "RESOLVED":
      return "active";
    case "REJECTED":
    case "REFUNDED":
      return "rejected";
    case "PENDING_REVIEW":
    case "ESCROWED":
    case "DISPUTED":
    case "OPEN":
      return "pending";
    default:
      return "";
  }
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${tone(status)}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
