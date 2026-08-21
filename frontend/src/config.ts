/**
 * Frontend configuration.
 *
 * VITE_CONTRACT_ADDRESS — the deployed KAVI contract address.
 * VITE_GENLAYER_NETWORK  — studionet (default) | testnet-asimov | localnet.
 * VITE_GENLAYER_RPC_URL  — optional RPC endpoint override.
 */

// The deployed AIMarketplace contract. VITE_CONTRACT_ADDRESS overrides it;
// the fallback keeps the deployed StudioNet app working without env vars.
// Env values are trimmed: a trailing space pasted into the Vercel env var
// would otherwise make the RPC reject the address as malformed.
function env(name: string, fallback: string): string {
  const value = import.meta.env[name] as string | undefined;
  return (value && value.trim()) || fallback;
}

export const CONTRACT_ADDRESS = env(
  "VITE_CONTRACT_ADDRESS",
  "0x26f5D0AAB364B7606eAB4eD2cb3E4d5A250C41c2",
);

export const NETWORK = env("VITE_GENLAYER_NETWORK", "studionet");

export const RPC_URL = env("VITE_GENLAYER_RPC_URL", "https://studio.genlayer.com/api");

/** Chain id of studionet, used to add/switch the network in the wallet. */
export const STUDIONET_CHAIN_ID = 61999;
export const STUDIONET_CHAIN_ID_HEX = "0xF23F";
