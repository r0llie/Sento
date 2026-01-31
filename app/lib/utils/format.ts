// ============================================
// Sento - Formatting Utilities
// ============================================

import { LAMPORTS_PER_SOL, CURRENT_NETWORK } from '../solana/constants';

/**
 * Format lamports to SOL with 2 decimal places
 * Examples: 0.11, 1.10, 11.01, 111.10
 */
export function formatLamportsToSol(lamports: number | bigint): string {
  const sol = Number(lamports) / LAMPORTS_PER_SOL;
  return sol.toFixed(2);
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

/**
 * Format wallet address for display (truncated)
 */
export function formatAddress(address: string, chars: number = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return formatDate(date);
}

/**
 * Format transaction signature for display
 */
export function formatSignature(signature: string, chars: number = 8): string {
  if (signature.length <= chars * 2 + 3) return signature;
  return `${signature.slice(0, chars)}...${signature.slice(-chars)}`;
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'SOL'): string {
  return `${formatLamportsToSol(amount)} ${currency}`;
}

/**
 * Parse SOL input string to lamports
 */
export function parseInputToLamports(input: string): number | null {
  const parsed = parseFloat(input);
  if (isNaN(parsed) || parsed < 0) return null;
  return solToLamports(parsed);
}

/**
 * Validate Solana public key string
 */
export function isValidPublicKey(address: string): boolean {
  // Basic validation: 32-44 characters, base58
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

/**
 * Generate unique invoice ID
 */
export function generateInvoiceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `inv_${timestamp}${random}`;
}

/**
 * Generate unique team ID
 */
export function generateTeamId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `team_${timestamp}${random}`;
}

/**
 * Generate unique batch payment ID
 */
export function generateBatchId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `batch_${timestamp}${random}`;
}

/**
 * Generate unique batch recipient ID
 */
export function generateBatchRecipientId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `row_${timestamp}${random}`;
}

/**
 * Get current cluster for explorer URLs
 */
function getClusterParam(): string {
  if (CURRENT_NETWORK === 'local') {
    return '?cluster=custom&customUrl=http://localhost:8899';
  }
  if (CURRENT_NETWORK === 'mainnet') {
    return '';
  }
  return `?cluster=${CURRENT_NETWORK}`;
}

/**
 * Get Solana Explorer URL for a transaction
 */
export function getExplorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}${getClusterParam()}`;
}

/**
 * Get Solana Explorer URL for an address
 */
export function getExplorerAddressUrl(address: string): string {
  return `https://explorer.solana.com/address/${address}${getClusterParam()}`;
}

/**
 * Get Solscan URL for a transaction (alternative explorer)
 */
export function getSolscanTxUrl(signature: string): string {
  const cluster = CURRENT_NETWORK === 'mainnet' ? '' : '?cluster=devnet';
  return `https://solscan.io/tx/${signature}${cluster}`;
}
