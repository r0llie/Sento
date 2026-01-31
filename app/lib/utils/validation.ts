// ============================================
// Sento - Input Validation & Sanitization
// Security-first validation for all user inputs
// ============================================

import { PublicKey } from '@solana/web3.js';

/**
 * Validate and sanitize Solana wallet address
 * Prevents SQL injection and invalid addresses
 */
export function validateWalletAddress(address: string): {
  valid: boolean;
  error?: string;
  sanitized?: string;
} {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address is required' };
  }

  // Trim whitespace
  const trimmed = address.trim();

  // Length check
  if (trimmed.length < 32 || trimmed.length > 44) {
    return { valid: false, error: 'Invalid address length' };
  }

  // Base58 character set validation (prevents injection)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  if (!base58Regex.test(trimmed)) {
    return { valid: false, error: 'Invalid address format' };
  }

  // Try to create PublicKey (validates actual Solana address)
  try {
    new PublicKey(trimmed);
    return { valid: true, sanitized: trimmed };
  } catch (error) {
    return { valid: false, error: 'Invalid Solana public key' };
  }
}

/**
 * Validate invoice amount
 * Prevents negative amounts, overflow, and invalid values
 */
export function validateAmount(amount: number | string): {
  valid: boolean;
  error?: string;
  sanitized?: number;
} {
  let numAmount: number;

  if (typeof amount === 'string') {
    const parsed = parseFloat(amount);
    if (isNaN(parsed)) {
      return { valid: false, error: 'Amount must be a number' };
    }
    numAmount = parsed;
  } else {
    numAmount = amount;
  }

  // Check for negative
  if (numAmount < 0) {
    return { valid: false, error: 'Amount cannot be negative' };
  }

  // Check for zero
  if (numAmount === 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }

  // Check for maximum (prevent overflow)
  const MAX_SOL = 1_000_000_000; // 1 billion SOL
  if (numAmount > MAX_SOL) {
    return { valid: false, error: 'Amount exceeds maximum' };
  }

  // Check minimum (dust attack prevention)
  const MIN_SOL = 0.000001; // 0.000001 SOL
  if (numAmount < MIN_SOL) {
    return { valid: false, error: 'Amount below minimum' };
  }

  // Round to prevent precision issues
  const sanitized = Math.floor(numAmount * 1_000_000_000); // Convert to lamports

  return { valid: true, sanitized };
}

/**
 * Sanitize note text
 * Prevents XSS attacks by removing HTML/JS
 */
export function sanitizeNote(note: string, maxLength: number = 500): {
  valid: boolean;
  error?: string;
  sanitized?: string;
} {
  if (!note || typeof note !== 'string') {
    return { valid: false, error: 'Note is required' };
  }

  // Trim whitespace
  const trimmed = note.trim();

  // Length check
  if (trimmed.length === 0) {
    return { valid: false, error: 'Note cannot be empty' };
  }

  if (trimmed.length > maxLength) {
    return { valid: false, error: `Note must be less than ${maxLength} characters` };
  }

  // Remove HTML tags (XSS prevention)
  const withoutHtml = trimmed.replace(/<[^>]*>/g, '');

  // Remove script tags and event handlers
  const withoutScripts = withoutHtml
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');

  // Remove control characters (except newlines and tabs)
  const sanitized = withoutScripts.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return { valid: true, sanitized };
}

/**
 * Validate invoice ID format
 * Prevents path traversal and injection
 */
export function validateInvoiceId(id: string): {
  valid: boolean;
  error?: string;
  sanitized?: string;
} {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'Invoice ID is required' };
  }

  const trimmed = id.trim();

  // Check format (alphanumeric + underscore + hyphen)
  const idRegex = /^[a-zA-Z0-9_-]+$/;
  if (!idRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid invoice ID format' };
  }

  // Length check
  if (trimmed.length < 3 || trimmed.length > 100) {
    return { valid: false, error: 'Invalid invoice ID length' };
  }

  // Prevent path traversal
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    return { valid: false, error: 'Invalid characters in invoice ID' };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validate transaction signature
 */
export function validateTxSignature(signature: string): {
  valid: boolean;
  error?: string;
  sanitized?: string;
} {
  if (!signature || typeof signature !== 'string') {
    return { valid: false, error: 'Signature is required' };
  }

  const trimmed = signature.trim();

  // Base58 validation
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{64,128}$/;
  if (!base58Regex.test(trimmed)) {
    return { valid: false, error: 'Invalid signature format' };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validate status value
 */
export function validateStatus(status: string): {
  valid: boolean;
  error?: string;
  sanitized?: 'unpaid' | 'paid' | 'cancelled';
} {
  const validStatuses: Array<'unpaid' | 'paid' | 'cancelled'> = ['unpaid', 'paid', 'cancelled'];
  
  if (!validStatuses.includes(status as any)) {
    return { valid: false, error: 'Invalid status' };
  }

  return { valid: true, sanitized: status as 'unpaid' | 'paid' | 'cancelled' };
}

/**
 * Validate team ID format
 */
export function validateTeamId(id: string): {
  valid: boolean;
  error?: string;
  sanitized?: string;
} {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'Team ID is required' };
  }

  const trimmed = id.trim();
  const idRegex = /^[a-zA-Z0-9_-]+$/;
  if (!idRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid team ID format' };
  }

  if (trimmed.length < 3 || trimmed.length > 100) {
    return { valid: false, error: 'Invalid team ID length' };
  }

  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    return { valid: false, error: 'Invalid characters in team ID' };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validate batch payment ID format
 */
export function validateBatchId(id: string): {
  valid: boolean;
  error?: string;
  sanitized?: string;
} {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'Batch ID is required' };
  }

  const trimmed = id.trim();
  const idRegex = /^[a-zA-Z0-9_-]+$/;
  if (!idRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid batch ID format' };
  }

  if (trimmed.length < 3 || trimmed.length > 100) {
    return { valid: false, error: 'Invalid batch ID length' };
  }

  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    return { valid: false, error: 'Invalid characters in batch ID' };
  }

  return { valid: true, sanitized: trimmed };
}
