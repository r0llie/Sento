// ============================================
// Sento - Solana Constants
// ============================================

import { PublicKey } from '@solana/web3.js';

/**
 * Environment-based configuration
 */
const IS_LOCAL = process.env.NEXT_PUBLIC_NETWORK === 'local';
const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY || 'YOUR_API_KEY';

/**
 * Network endpoints
 * Using Helius for ZK Compression support on devnet/mainnet
 * Local endpoints for development with light test-validator
 */
export const ENDPOINTS = {
  local: {
    rpc: 'http://localhost:8899',
    compression: 'http://localhost:8784',
    prover: 'http://localhost:3001',
  },
  devnet: {
    rpc: `https://devnet.helius-rpc.com?api-key=${HELIUS_API_KEY}`,
    compression: `https://devnet.helius-rpc.com?api-key=${HELIUS_API_KEY}`,
    prover: `https://devnet.helius-rpc.com?api-key=${HELIUS_API_KEY}`,
  },
  mainnet: {
    rpc: `https://mainnet.helius-rpc.com?api-key=${HELIUS_API_KEY}`,
    compression: `https://mainnet.helius-rpc.com?api-key=${HELIUS_API_KEY}`,
    prover: `https://mainnet.helius-rpc.com?api-key=${HELIUS_API_KEY}`,
  },
} as const;

/**
 * Current network
 */
export const CURRENT_NETWORK: 'local' | 'devnet' | 'mainnet' = IS_LOCAL ? 'local' : 'devnet';

/**
 * RPC endpoints for current network
 */
export const RPC_ENDPOINT = ENDPOINTS[CURRENT_NETWORK].rpc;
export const COMPRESSION_ENDPOINT = ENDPOINTS[CURRENT_NETWORK].compression;
export const PROVER_ENDPOINT = ENDPOINTS[CURRENT_NETWORK].prover;

/**
 * Token decimals
 */
export const TOKEN_DECIMALS = 9;

/**
 * Lamports per SOL
 */
export const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Fee percentage for Sento (0.5%)
 */
export const SENTO_FEE_PERCENTAGE = 0.005;

/**
 * Platform fee wallet address (public)
 * Used to collect protocol fees on payments
 */
export const PLATFORM_FEE_WALLET = process.env.NEXT_PUBLIC_PLATFORM_FEE_WALLET || '';

/**
 * Toggle platform fee on/off
 */
export const PLATFORM_FEE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_PLATFORM_FEE !== 'false';

/**
 * Minimum invoice amount in lamports
 */
export const MIN_INVOICE_AMOUNT = 1000; // 0.000001 SOL

/**
 * Maximum invoice amount in lamports (10,000 SOL)
 */
export const MAX_INVOICE_AMOUNT = 10_000 * LAMPORTS_PER_SOL;

/**
 * Commitment level for transactions
 */
export const COMMITMENT = 'confirmed' as const;

/**
 * Explorer URLs
 */
export const EXPLORER_URL = {
  local: 'https://explorer.solana.com',
  devnet: 'https://explorer.solana.com',
  mainnet: 'https://explorer.solana.com',
} as const;

/**
 * Get cluster query string for explorer
 */
function getClusterQuery(): string {
  if (CURRENT_NETWORK === 'local') {
    return '?cluster=custom&customUrl=http://localhost:8899';
  }
  if (CURRENT_NETWORK === 'devnet') {
    return '?cluster=devnet';
  }
  return '';
}

/**
 * Get transaction explorer URL
 */
export function getExplorerTxUrl(signature: string): string {
  const baseUrl = EXPLORER_URL[CURRENT_NETWORK];
  return `${baseUrl}/tx/${signature}${getClusterQuery()}`;
}

/**
 * Get address explorer URL
 */
export function getExplorerAddressUrl(address: string): string {
  const baseUrl = EXPLORER_URL[CURRENT_NETWORK];
  return `${baseUrl}/address/${address}${getClusterQuery()}`;
}
