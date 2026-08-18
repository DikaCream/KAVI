import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createMarketplaceClient } from "../lib/client";
import { Marketplace } from "../lib/contract";
import { useWallet } from "../hooks/useWallet";

interface MarketplaceContextValue {
  wallet: ReturnType<typeof useWallet>;
  contract: Marketplace;
}

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  const contract = useMemo(() => {
    const client = createMarketplaceClient(wallet.address);
    return new Marketplace(client);
  }, [wallet.address]);

  return (
    <MarketplaceContext.Provider value={{ wallet, contract }}>
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace(): MarketplaceContextValue {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) {
    throw new Error("useMarketplace must be used within a MarketplaceProvider");
  }
  return ctx;
}
