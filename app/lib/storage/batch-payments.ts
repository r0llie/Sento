// ============================================
// Sento - Batch Payments Storage (Supabase + localStorage)
// ============================================

import type { BatchPayment, BatchRecipient } from '@/types';
import { validateBatchId, validateTeamId, validateWalletAddress } from '../utils/validation';

// Environment configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const USE_SUPABASE = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// LocalStorage key
const LOCAL_STORAGE_KEY = 'sento_batch_payments';

// Supabase client (lazy)
import type { SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';

let supabaseClient: SupabaseClientType | null = null;

async function getSupabaseClient(): Promise<SupabaseClientType | null> {
  if (!USE_SUPABASE) return null;
  if (supabaseClient) return supabaseClient;

  try {
    const { createClient } = await import('@supabase/supabase-js');
    supabaseClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    return supabaseClient;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null;
  }
}

/**
 * Supabase schema:
 * 
 * CREATE TABLE batch_payments (
 *   id TEXT PRIMARY KEY,
 *   creator_wallet TEXT NOT NULL,
 *   team_id TEXT,
 *   total_amount BIGINT NOT NULL,
 *   proof_hash TEXT,
 *   status TEXT NOT NULL,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 * 
 * CREATE TABLE batch_recipients (
 *   id TEXT PRIMARY KEY,
 *   batch_id TEXT NOT NULL,
 *   wallet TEXT NOT NULL,
 *   amount BIGINT NOT NULL,
 *   note TEXT,
 *   status TEXT NOT NULL,
 *   tx_signature TEXT,
 *   error TEXT
 * );
 */

interface BatchPaymentDB {
  id: string;
  creator_wallet: string;
  team_id: string | null;
  total_amount: number;
  proof_hash: string | null;
  status: string;
  created_at: string;
}

interface BatchRecipientDB {
  id: string;
  batch_id: string;
  wallet: string;
  amount: number;
  note: string | null;
  status: string;
  tx_signature: string | null;
  error: string | null;
}

function toBatchPayment(
  payment: BatchPaymentDB,
  recipients: BatchRecipientDB[]
): BatchPayment {
  return {
    id: payment.id,
    creatorWallet: payment.creator_wallet,
    teamId: payment.team_id || undefined,
    totalAmount: payment.total_amount,
    proofHash: payment.proof_hash || undefined,
    status: payment.status as BatchPayment['status'],
    createdAt: new Date(payment.created_at),
    recipients: recipients.map((recipient) => ({
      id: recipient.id,
      wallet: recipient.wallet,
      amount: recipient.amount,
      note: recipient.note || undefined,
      status: recipient.status as BatchRecipient['status'],
      txSignature: recipient.tx_signature || undefined,
      error: recipient.error || undefined,
    })),
  };
}

function serializeBatchPayment(payment: BatchPayment): BatchPayment {
  return {
    ...payment,
    createdAt: payment.createdAt instanceof Date ? payment.createdAt : new Date(payment.createdAt),
  };
}

// ============================================
// Public API
// ============================================

export async function saveBatchPayment(payment: BatchPayment): Promise<BatchPayment> {
  const client = await getSupabaseClient();
  if (client) {
    return saveBatchPaymentToSupabase(client, payment);
  }

  return saveBatchPaymentToLocalStorage(payment);
}

export async function getBatchPaymentsForWallet(walletAddress: string): Promise<BatchPayment[]> {
  const client = await getSupabaseClient();
  if (client) {
    return getBatchPaymentsFromSupabase(client, walletAddress);
  }

  return getBatchPaymentsFromLocalStorage(walletAddress);
}

// ============================================
// Supabase operations
// ============================================

async function saveBatchPaymentToSupabase(
  client: SupabaseClientType,
  payment: BatchPayment
): Promise<BatchPayment> {
  const idValidation = validateBatchId(payment.id);
  const creatorValidation = validateWalletAddress(payment.creatorWallet);
  const teamValidation = payment.teamId ? validateTeamId(payment.teamId) : { valid: true, sanitized: payment.teamId };

  if (!idValidation.valid || !creatorValidation.valid || !teamValidation.valid) {
    return saveBatchPaymentToLocalStorage(payment);
  }

  const paymentPayload: BatchPaymentDB = {
    id: idValidation.sanitized!,
    creator_wallet: creatorValidation.sanitized!,
    team_id: teamValidation.sanitized || null,
    total_amount: payment.totalAmount,
    proof_hash: payment.proofHash || null,
    status: payment.status,
    created_at: payment.createdAt.toISOString(),
  };

  const { error } = await client.from('batch_payments').insert(paymentPayload);
  if (error) {
    console.error('Supabase batch_payments insert error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    console.warn('Falling back to localStorage for batch payment storage');
    return saveBatchPaymentToLocalStorage(payment);
  }

  const recipientsPayload: BatchRecipientDB[] = payment.recipients.map((recipient) => ({
    id: recipient.id,
    batch_id: paymentPayload.id,
    wallet: recipient.wallet,
    amount: recipient.amount,
    note: recipient.note || null,
    status: recipient.status,
    tx_signature: recipient.txSignature || null,
    error: recipient.error || null,
  }));

  if (recipientsPayload.length > 0) {
    const { error: recipientsError } = await client.from('batch_recipients').insert(recipientsPayload);
    if (recipientsError) {
      console.error('Supabase batch_recipients insert error:', {
        message: recipientsError.message,
        details: recipientsError.details,
        hint: recipientsError.hint,
        code: recipientsError.code,
      });
      console.warn('Batch payment saved but recipients failed to save to Supabase');
    }
  }

  saveBatchPaymentToLocalStorage(payment);
  return payment;
}

async function getBatchPaymentsFromSupabase(
  client: SupabaseClientType,
  walletAddress: string
): Promise<BatchPayment[]> {
  try {
    const walletValidation = validateWalletAddress(walletAddress);
    if (!walletValidation.valid) return getBatchPaymentsFromLocalStorage(walletAddress);
    const sanitizedWallet = walletValidation.sanitized!;

    const { data: payments } = await client
      .from('batch_payments')
      .select('*')
      .eq('creator_wallet', sanitizedWallet);

    if (!payments || payments.length === 0) return [];

    const batchIds = payments.map((row) => row.id);
    const { data: recipients } = await client
      .from('batch_recipients')
      .select('*')
      .in('batch_id', batchIds);

    const recipientsByBatch = new Map<string, BatchRecipientDB[]>();
    (recipients || []).forEach((row) => {
      if (!recipientsByBatch.has(row.batch_id)) {
        recipientsByBatch.set(row.batch_id, []);
      }
      recipientsByBatch.get(row.batch_id)!.push(row);
    });

    return payments
      .map((payment) =>
        toBatchPayment(payment as BatchPaymentDB, recipientsByBatch.get(payment.id) || [])
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Failed to load batch payments:', error);
    return getBatchPaymentsFromLocalStorage(walletAddress);
  }
}

// ============================================
// localStorage operations
// ============================================

function getBatchPaymentsFromLocalStorage(walletAddress: string): BatchPayment[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) return [];

  try {
    const payments = JSON.parse(stored) as BatchPayment[];
    return payments
      .map(serializeBatchPayment)
      .filter((payment) => payment.creatorWallet === walletAddress);
  } catch (error) {
    console.error('Failed to parse batch payments from localStorage:', error);
    return [];
  }
}

function saveBatchPaymentToLocalStorage(payment: BatchPayment): BatchPayment {
  if (typeof window === 'undefined') return payment;

  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  const payments: BatchPayment[] = stored ? JSON.parse(stored) : [];
  const nextPayments = payments.filter((item) => item.id !== payment.id);
  nextPayments.unshift(payment);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextPayments));

  return payment;
}
