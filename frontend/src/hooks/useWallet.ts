import { useCallback, useEffect, useState } from "react";
import { connectWallet, getAccounts, isMetaMaskInstalled } from "../lib/client";

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [hasProvider, setHasProvider] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHasProvider(isMetaMaskInstalled());
    getAccounts().then((accounts) => {
      if (accounts.length) setAddress(accounts[0]);
    });
  }, []);

  const connect = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const addr = await connectWallet();
      setAddress(addr);
    } catch (e: any) {
      setError(e?.message ?? "Failed to connect wallet.");
    } finally {
      setBusy(false);
    }
  }, []);

  const disconnect = useCallback(() => setAddress(null), []);

  return { address, hasProvider, busy, error, connect, disconnect };
}
