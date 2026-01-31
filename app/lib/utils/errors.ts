// ============================================
// Sento - Error Handling Utilities
// Centralized error management with user-friendly messages
// ============================================

/**
 * Error codes for categorizing errors
 */
export const ERROR_CODES = {
  // Wallet errors
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
  WALLET_REJECTED: 'WALLET_REJECTED',
  WALLET_DISCONNECTED: 'WALLET_DISCONNECTED',
  
  // Balance errors
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INSUFFICIENT_COMPRESSED_BALANCE: 'INSUFFICIENT_COMPRESSED_BALANCE',
  
  // Transaction errors
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  TRANSACTION_TIMEOUT: 'TRANSACTION_TIMEOUT',
  TRANSACTION_CANCELLED: 'TRANSACTION_CANCELLED',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  RPC_ERROR: 'RPC_ERROR',
  
  // Validation errors
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_INVOICE: 'INVALID_INVOICE',
  
  // Compliance errors
  COMPLIANCE_CHECK_FAILED: 'COMPLIANCE_CHECK_FAILED',
  WALLET_NOT_COMPLIANT: 'WALLET_NOT_COMPLIANT',
  
  // Storage errors
  STORAGE_ERROR: 'STORAGE_ERROR',
  
  // Generic
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/**
 * User-friendly error messages
 */
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet to continue.',
  WALLET_REJECTED: 'You declined the transaction. Please try again.',
  WALLET_DISCONNECTED: 'Your wallet was disconnected. Please reconnect.',
  
  INSUFFICIENT_BALANCE: 'Insufficient balance. Please add more SOL to your wallet.',
  INSUFFICIENT_COMPRESSED_BALANCE: 'Insufficient private balance. Please compress more SOL first.',
  
  TRANSACTION_FAILED: 'Transaction failed. Please try again.',
  TRANSACTION_TIMEOUT: 'Transaction timed out. Please check your network and try again.',
  TRANSACTION_CANCELLED: 'Transaction was cancelled.',
  
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  RPC_ERROR: 'Unable to connect to Solana. Please try again later.',
  
  INVALID_ADDRESS: 'Invalid wallet address. Please check and try again.',
  INVALID_AMOUNT: 'Invalid amount. Please enter a valid number.',
  INVALID_INVOICE: 'Invalid invoice. This invoice may not exist.',
  
  COMPLIANCE_CHECK_FAILED: 'Compliance check failed. Please try again.',
  WALLET_NOT_COMPLIANT: 'This wallet cannot be used for payments at this time.',
  
  STORAGE_ERROR: 'Failed to save data. Please try again.',
  
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

/**
 * Custom error class for Sento
 */
export class SentoError extends Error {
  public readonly code: ErrorCode;
  public readonly userMessage: string;
  public readonly originalError?: Error;
  public readonly context?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    const userMessage = ERROR_MESSAGES[code];
    super(userMessage);
    
    this.name = 'SentoError';
    this.code = code;
    this.userMessage = userMessage;
    this.originalError = originalError;
    this.context = context;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SentoError);
    }
  }
}

/**
 * Parse error message and extract error code
 */
export function parseError(error: unknown): SentoError {
  // Already a SentoError
  if (error instanceof SentoError) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Wallet errors
    if (message.includes('wallet') && message.includes('not connected')) {
      return new SentoError('WALLET_NOT_CONNECTED', error);
    }
    if (message.includes('user rejected') || message.includes('user declined')) {
      return new SentoError('WALLET_REJECTED', error);
    }
    if (message.includes('disconnected')) {
      return new SentoError('WALLET_DISCONNECTED', error);
    }
    
    // Balance errors
    if (message.includes('insufficient') && message.includes('balance')) {
      return new SentoError('INSUFFICIENT_BALANCE', error);
    }
    if (message.includes('insufficient') && message.includes('compressed')) {
      return new SentoError('INSUFFICIENT_COMPRESSED_BALANCE', error);
    }
    
    // Transaction errors
    if (message.includes('transaction') && message.includes('failed')) {
      return new SentoError('TRANSACTION_FAILED', error);
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return new SentoError('TRANSACTION_TIMEOUT', error);
    }
    if (message.includes('cancelled') || message.includes('canceled')) {
      return new SentoError('TRANSACTION_CANCELLED', error);
    }
    
    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      return new SentoError('NETWORK_ERROR', error);
    }
    if (message.includes('rpc') || message.includes('connection refused')) {
      return new SentoError('RPC_ERROR', error);
    }
    
    // Validation errors
    if (message.includes('invalid') && message.includes('address')) {
      return new SentoError('INVALID_ADDRESS', error);
    }
    if (message.includes('invalid') && message.includes('amount')) {
      return new SentoError('INVALID_AMOUNT', error);
    }
    
    // Compliance errors
    if (message.includes('compliance')) {
      return new SentoError('COMPLIANCE_CHECK_FAILED', error);
    }
    if (message.includes('not compliant') || message.includes('sanctioned')) {
      return new SentoError('WALLET_NOT_COMPLIANT', error);
    }
    
    // Storage errors
    if (message.includes('storage') || message.includes('localstorage')) {
      return new SentoError('STORAGE_ERROR', error);
    }
    
    // Fallback: unknown error with original message
    return new SentoError('UNKNOWN_ERROR', error);
  }
  
  // String error
  if (typeof error === 'string') {
    return parseError(new Error(error));
  }
  
  // Unknown error type
  return new SentoError('UNKNOWN_ERROR');
}

/**
 * Get user-friendly error message from any error
 */
export function getUserFriendlyMessage(error: unknown): string {
  const sentoError = parseError(error);
  return sentoError.userMessage;
}

/**
 * Log error with context (for debugging)
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const sentoError = parseError(error);
  
  console.error('[Sento Error]', {
    code: sentoError.code,
    message: sentoError.userMessage,
    originalMessage: sentoError.originalError?.message,
    context: { ...sentoError.context, ...context },
    stack: sentoError.stack,
  });
}

/**
 * Create a SentoError with additional context
 */
export function createError(
  code: ErrorCode,
  context?: Record<string, unknown>
): SentoError {
  return new SentoError(code, undefined, context);
}

/**
 * Error boundary helper - determine if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const sentoError = parseError(error);
  
  const retryableCodes: ErrorCode[] = [
    'NETWORK_ERROR',
    'RPC_ERROR',
    'TRANSACTION_TIMEOUT',
    'COMPLIANCE_CHECK_FAILED',
  ];
  
  return retryableCodes.includes(sentoError.code);
}

/**
 * Error boundary helper - determine if error needs wallet reconnection
 */
export function needsWalletReconnection(error: unknown): boolean {
  const sentoError = parseError(error);
  
  const walletCodes: ErrorCode[] = [
    'WALLET_NOT_CONNECTED',
    'WALLET_DISCONNECTED',
  ];
  
  return walletCodes.includes(sentoError.code);
}

/**
 * Wrap async function with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  onError?: (error: SentoError) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const sentoError = parseError(error);
    logError(sentoError);
    onError?.(sentoError);
    return null;
  }
}
