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
  "0x06ff588FA96c71A050CCBd789Ed5f6643684Ff97",
);

// Public catalog: keep only the four vetted v3 listings visible. Rejected,
// duplicate, and experimental on-chain entries remain out of the app.
export const PUBLIC_SKILL_IDS = new Set([1, 2, 3, 4]);

export function isPublicSkill(skill: { id: number; status: string }): boolean {
  return skill.status === "ACTIVE" && PUBLIC_SKILL_IDS.has(skill.id);
}

export const NETWORK = env("VITE_GENLAYER_NETWORK", "studionet");

export const RPC_URL = env("VITE_GENLAYER_RPC_URL", "https://studio.genlayer.com/api");

/** Chain id of studionet, used to add/switch the network in the wallet. */
export const STUDIONET_CHAIN_ID = 61999;
export const STUDIONET_CHAIN_ID_HEX = "0xF23F";
