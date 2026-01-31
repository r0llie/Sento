// ============================================
// Sento - Type Definitions
// ============================================

/**
 * Invoice status enum
 */
export type InvoiceStatus = 'unpaid' | 'paid' | 'cancelled';

/**
 * Invoice data model
 * Note: amount is stored client-side only, never on-chain
 */
export interface Invoice {
  id: string;
  sender: string;           // Wallet address of invoice creator
  recipient: string;        // Wallet address of payment recipient
  amount: number;           // Amount in lamports (private, not on-chain)
  note: string;             // Invoice description/memo
  status: InvoiceStatus;
  teamId?: string;          // Optional team context for team-scoped invoices
  createdBy?: string;       // Wallet address of the team member who created it
  createdAt: Date;
  paidAt?: Date;
  txSignature?: string;     // Transaction signature after payment
}

/**
 * Create invoice form data
 */
export interface CreateInvoiceData {
  recipient: string;
  amount: number;
  note: string;
}

/**
 * Private balance info
 */
export interface PrivateBalance {
  amount: number;           // Balance in lamports
  lastUpdated: Date;
  compressedAccounts: number; // Number of compressed token accounts
}

/**
 * Compliance status
 */
export interface ComplianceStatus {
  isCompliant: boolean;
  checkedAt: Date;
  proofHash?: string;
}

/**
 * Transaction result
 */
export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
}

/**
 * App notification
 */
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

/**
 * Team roles
 */
export type TeamRole = 'viewer' | 'creator';

/**
 * Team member
 */
export interface TeamMember {
  wallet: string;
  role: TeamRole;
  addedAt: Date;
}

/**
 * Team entity
 */
export interface Team {
  id: string;
  name: string;
  ownerWallet: string;
  members: TeamMember[];
  createdAt: Date;
}

/**
 * Batch payment status
 */
export type BatchPaymentStatus = 'pending' | 'completed' | 'failed' | 'partial';

/**
 * Batch payment recipient row
 */
export interface BatchRecipient {
  id: string;
  wallet: string;
  amount: number; // lamports
  note?: string;
  status: 'pending' | 'paid' | 'failed';
  txSignature?: string;
  error?: string;
}

/**
 * Batch payment
 */
export interface BatchPayment {
  id: string;
  creatorWallet: string;
  teamId?: string;
  totalAmount: number;
  proofHash?: string;
  status: BatchPaymentStatus;
  createdAt: Date;
  recipients: BatchRecipient[];
}
