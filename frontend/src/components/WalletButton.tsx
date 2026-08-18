import { useMarketplace } from "../context/MarketplaceContext";
import { formatAddress, formatGen } from "../lib/client";

export default function WalletButton() {
  const { wallet } = useMarketplace();

  if (wallet.address) {
    return (
      <div className="wallet-pill">
        <span
          className={`net ${wallet.isRightNetwork ? "ok" : "bad"}`}
          title={
            wallet.isRightNetwork
              ? "On GenLayer StudioNet"
              : "Wrong network — switch to StudioNet"
          }
        >
          {wallet.isRightNetwork ? "StudioNet" : "Wrong network"}
        </span>
        <span className="balance" title="GEN balance">
          {formatGen(wallet.balance)}
        </span>
        <span title={wallet.address}>{formatAddress(wallet.address)}</span>
        <button
          className="ghost small"
          onClick={wallet.disconnect}
          title="Disconnect"
          aria-label="Disconnect wallet"
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
        Install a wallet
      </a>
    );
  }

  return (
    <button className="primary" onClick={wallet.connect} disabled={wallet.busy}>
      {wallet.busy ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
