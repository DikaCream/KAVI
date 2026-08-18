import { useMarketplace } from "../context/MarketplaceContext";
import { formatAddress } from "../lib/client";

export default function WalletButton() {
  const { wallet } = useMarketplace();

  if (wallet.address) {
    return (
      <div className="wallet-pill">
        <span className="dot" />
        <span title={wallet.address}>{formatAddress(wallet.address)}</span>
        <button
          className="ghost small"
          onClick={wallet.disconnect}
          title="Disconnect"
        >
          ✕
        </button>
      </div>
    );
  }

  if (!wallet.hasProvider) {
    return (
      <a
        className="muted"
        href="https://metamask.io/download/"
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: "0.85rem" }}
      >
        Install MetaMask
      </a>
    );
  }

  return (
    <button className="primary" onClick={wallet.connect} disabled={wallet.busy}>
      {wallet.busy ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
