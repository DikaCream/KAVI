/**
 * Frontend configuration.
 *
 * VITE_CONTRACT_ADDRESS — the deployed AIMarketplace contract address.
 * VITE_GENLAYER_NETWORK  — studionet (default) | testnet-asimov | localnet.
 * VITE_GENLAYER_RPC_URL  — optional RPC endpoint override.
 */

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS as string) || "";

export const NETWORK = (import.meta.env.VITE_GENLAYER_NETWORK as string) || "studionet";

export const RPC_URL =
  (import.meta.env.VITE_GENLAYER_RPC_URL as string) ||
  "https://studio.genlayer.com/api";

/** Chain id of studionet, used to add/switch the network in the wallet. */
export const STUDIONET_CHAIN_ID = 61999;
export const STUDIONET_CHAIN_ID_HEX = "0xF23F";
