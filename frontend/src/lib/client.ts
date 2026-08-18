import { createClient } from "genlayer-js";
import { studionet, localnet } from "genlayer-js/chains";
import {
  NETWORK,
  RPC_URL,
  STUDIONET_CHAIN_ID,
  STUDIONET_CHAIN_ID_HEX,
} from "../config";

interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

function getChain(): any {
  if (NETWORK === "localnet") return localnet;
  // studionet is the default; testnet names fall back to studionet config but
  // with a different endpoint set via RPC_URL.
  return studionet;
}

/**
 * Create a genlayer-js client. When `address` is provided the client signs
 * transactions through the injected provider (window.ethereum).
 */
export function createMarketplaceClient(address?: string | null) {
  const config: any = { chain: getChain() };
  if (address) config.account = address as `0x${string}`;
  if (RPC_URL) config.endpoint = RPC_URL;
  return createClient(config) as any;
}

export function getProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  return window.ethereum || null;
}

export function isMetaMaskInstalled(): boolean {
  return !!getProvider()?.isMetaMask;
}

export async function requestAccounts(): Promise<string[]> {
  const provider = getProvider();
  if (!provider) throw new Error("No injected wallet found. Install MetaMask.");
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  return accounts;
}

export async function getAccounts(): Promise<string[]> {
  const provider = getProvider();
  if (!provider) return [];
  try {
    return (await provider.request({ method: "eth_accounts" })) as string[];
  } catch {
    return [];
  }
}

async function addStudionet(provider: EthereumProvider) {
  await provider.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: STUDIONET_CHAIN_ID_HEX,
        chainName: "GenLayer Studio",
        nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
        rpcUrls: [RPC_URL],
        blockExplorerUrls: [],
      },
    ],
  });
}

async function switchToStudionet(provider: EthereumProvider) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
    });
  } catch (err: any) {
    if (err?.code === 4902) await addStudionet(provider);
    else throw err;
  }
}

async function ensureNetwork(provider: EthereumProvider) {
  const chainId = (await provider.request({ method: "eth_chainId" })) as string;
  const current = parseInt(chainId, 16);
  if (current !== STUDIONET_CHAIN_ID) {
    await switchToStudionet(provider);
  }
}

/**
 * Connect the injected wallet and ensure it is on the GenLayer network.
 * Returns the active address.
 */
export async function connectWallet(): Promise<string> {
  const provider = getProvider();
  if (!provider) throw new Error("No injected wallet found. Install MetaMask.");

  const accounts = await requestAccounts();
  if (!accounts.length) throw new Error("No accounts available.");

  try {
    await ensureNetwork(provider);
  } catch (err: any) {
    if (err?.code === 4001) throw new Error("Connection cancelled.");
    // Network switching can fail on some wallets; proceed on studionet default.
    console.warn("Could not switch network:", err);
  }
  return accounts[0];
}

export function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatGen(amount: number): string {
  return `${amount.toLocaleString()} GEN`;
}
