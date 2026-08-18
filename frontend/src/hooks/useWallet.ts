import { useCallback, useEffect, useState } from "react";
import {
  connectWallet,
  getAccounts,
  getBalance,
  getChainId,
  hasEthereumProvider,
  onAccountsChanged,
  onChainChanged,
} from "../lib/client";
import { STUDIONET_CHAIN_ID_HEX } from "../config";

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [hasProvider, setHasProvider] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<bigint>(0n);
  const [chainId, setChainId] = useState<string | null>(null);

  const refreshBalance = useCallback(async (addr: string) => {
    setBalance(await getBalance(addr));
  }, []);

  // Initial detection + hydration from an already-connected wallet.
  useEffect(() => {
    setHasProvider(hasEthereumProvider());
    getChainId().then(setChainId);
    getAccounts().then((accounts) => {
      if (accounts.length) {
        setAddress(accounts[0]);
        refreshBalance(accounts[0]);
      }
    });
  }, [refreshBalance]);

  // React to MetaMask account / network changes in real time.
  useEffect(() => {
    const offAccounts = onAccountsChanged((accounts) => {
      const next = accounts.length ? accounts[0] : null;
      setAddress(next);
      if (next) refreshBalance(next);
      else setBalance(0n);
    });
    const offChain = onChainChanged((id) => {
      setChainId(id);
      if (address) refreshBalance(address);
    });
    return () => {
      offAccounts();
      offChain();
    };
  }, [address, refreshBalance]);

  const connect = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const addr = await connectWallet();
      setAddress(addr);
      setChainId(await getChainId());
      await refreshBalance(addr);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect wallet.");
    } finally {
      setBusy(false);
    }
  }, [refreshBalance]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setBalance(0n);
  }, []);

  const isRightNetwork =
    chainId != null && chainId.toLowerCase() === STUDIONET_CHAIN_ID_HEX.toLowerCase();

  return {
    address,
    hasProvider,
    busy,
    error,
    balance,
    chainId,
    isRightNetwork,
    connect,
    disconnect,
  };
}
