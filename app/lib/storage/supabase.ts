// ============================================
// Sento - Supabase Storage Integration
// Persistent invoice storage with fallback to localStorage
// ============================================

/**
 * Supabase provides persistent storage for invoices
 * Falls back to localStorage if Supabase is not configured
 * 
 * To enable Supabase:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Create an 'invoices' table with the schema below
 * 3. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
 */

import type { Invoice } from '@/types';
import { validateWalletAddress, validateAmount, sanitizeNote, validateInvoiceId, validateTxSignature, validateStatus, validateTeamId } from '../utils/validation';

// Environment configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const USE_SUPABASE = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// LocalStorage key for fallback
const LOCAL_STORAGE_KEY = 'sento_invoices';

// ============================================
// Supabase Client (Lazy initialization)
// ============================================

import type { SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';

let supabaseClient: SupabaseClientType | null = null;

async function getSupabaseClient(): Promise<SupabaseClientType | null> {
  if (!USE_SUPABASE) return null;
  
  if (supabaseClient) return supabaseClient;
  
  try {
    // Dynamic import to avoid bundling if not used
    const { createClient } = await import('@supabase/supabase-js');
    supabaseClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    return supabaseClient;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null;
  }
}

// ============================================
// Database Schema
// ============================================

/**
 * Supabase table schema for 'invoices':
 * 
 * CREATE TABLE invoices (
 *   id TEXT PRIMARY KEY,
 *   sender TEXT NOT NULL,
 *   recipient TEXT NOT NULL,
 *   amount BIGINT NOT NULL,
 *   note TEXT,
 *   status TEXT NOT NULL DEFAULT 'unpaid',
 *   team_id TEXT,
 *   created_by TEXT,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   paid_at TIMESTAMPTZ,
 *   tx_signature TEXT,
 *   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 * 
 * -- Enable Row Level Security
 * ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
 * 
 * -- Policy: Users can read invoices where they are sender or recipient
 * CREATE POLICY "Users can read own invoices" ON invoices
 *   FOR SELECT USING (true); -- Public read for MVP, restrict in production
 * 
 * -- Policy: Anyone can insert invoices (public for MVP)
 * CREATE POLICY "Anyone can insert invoices" ON invoices
 *   FOR INSERT WITH CHECK (true);
 * 
 * -- Policy: Anyone can update invoices (restrict in production)
 * CREATE POLICY "Anyone can update invoices" ON invoices
 *   FOR UPDATE USING (true);
 */

// ============================================
// Invoice Storage Interface
// ============================================

interface InvoiceDB {
  id: string;
  sender: string;
  recipient: string;
  amount: number;
  note: string | null;
  status: 'unpaid' | 'paid' | 'cancelled';
  team_id?: string | null;
  created_by?: string | null;
  created_at: string;
  paid_at: string | null;
  tx_signature: string | null;
}

function toInvoice(db: InvoiceDB): Invoice {
  return {
    id: db.id,
    sender: db.sender,
    recipient: db.recipient,
    amount: db.amount,
    note: db.note || '',
    status: db.status,
    teamId: db.team_id || undefined,
    createdBy: db.created_by || undefined,
    createdAt: new Date(db.created_at),
    paidAt: db.paid_at ? new Date(db.paid_at) : undefined,
    txSignature: db.tx_signature || undefined,
  };
}

function toInvoiceDB(invoice: Invoice): InvoiceDB {
  return {
    id: invoice.id,
    sender: invoice.sender,
    recipient: invoice.recipient,
    amount: invoice.amount,
    note: invoice.note || null,
    status: invoice.status,
    team_id: invoice.teamId || null,
    created_by: invoice.createdBy || null,
    created_at: invoice.createdAt instanceof Date 
      ? invoice.createdAt.toISOString() 
      : invoice.createdAt,
    paid_at: invoice.paidAt 
      ? (invoice.paidAt instanceof Date ? invoice.paidAt.toISOString() : invoice.paidAt)
      : null,
    tx_signature: invoice.txSignature || null,
  };
}

// ============================================
// Storage Operations
// ============================================

/**
 * Get all invoices for a wallet address
 */
export async function getInvoices(walletAddress: string, teamId?: string | null): Promise<Invoice[]> {
  const client = await getSupabaseClient();
  
  if (client) {
    return getInvoicesFromSupabase(client, walletAddress, teamId);
  }
  
  return getInvoicesFromLocalStorage(walletAddress, teamId);
}

/**
 * Get a single invoice by ID
 */
export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  const client = await getSupabaseClient();
  
  if (client) {
    return getInvoiceFromSupabase(client, invoiceId);
  }
  
  return getInvoiceFromLocalStorage(invoiceId);
}

/**
 * Save a new invoice
 */
export async function saveInvoice(invoice: Invoice): Promise<Invoice> {
  const client = await getSupabaseClient();
  
  if (client) {
    return saveInvoiceToSupabase(client, invoice);
  }
  
  return saveInvoiceToLocalStorage(invoice);
}

/**
 * Update an existing invoice
 */
export async function updateInvoice(
  invoiceId: string, 
  updates: Partial<Invoice>
): Promise<Invoice | null> {
  const client = await getSupabaseClient();
  
  if (client) {
    return updateInvoiceInSupabase(client, invoiceId, updates);
  }
  
  return updateInvoiceInLocalStorage(invoiceId, updates);
}

/**
 * Delete an invoice
 */
export async function deleteInvoice(invoiceId: string): Promise<boolean> {
  const client = await getSupabaseClient();
  
  if (client) {
    return deleteInvoiceFromSupabase(client, invoiceId);
  }
  
  return deleteInvoiceFromLocalStorage(invoiceId);
}

// ============================================
// Supabase Operations
// ============================================

async function getInvoicesFromSupabase(
  client: SupabaseClientType, 
  walletAddress: string,
  teamId?: string | null
): Promise<Invoice[]> {
  try {
    if (teamId) {
      const teamValidation = validateTeamId(teamId);
      if (!teamValidation.valid) {
        console.error('Invalid team ID:', teamValidation.error);
        return getInvoicesFromLocalStorage(walletAddress, teamId);
      }

      const { data, error } = await client
        .from('invoices')
        .select('*')
        .eq('team_id', teamValidation.sanitized!);
      
      if (error) {
        console.error('Supabase error:', error);
        return getInvoicesFromLocalStorage(walletAddress, teamId);
      }
      
      if (!data) return [];
      
      const validInvoices: Invoice[] = [];
      for (const dbInvoice of data as InvoiceDB[]) {
        try {
          if (
            validateWalletAddress(dbInvoice.sender).valid &&
            validateWalletAddress(dbInvoice.recipient).valid &&
            validateInvoiceId(dbInvoice.id).valid &&
            validateStatus(dbInvoice.status).valid
          ) {
            validInvoices.push(toInvoice(dbInvoice));
          }
        } catch (err) {
          console.warn('Error processing invoice:', dbInvoice.id, err);
        }
      }
      
      return validInvoices.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // Validate wallet address (security: prevent injection)
    const addressValidation = validateWalletAddress(walletAddress);
    if (!addressValidation.valid) {
      console.error('Invalid wallet address:', addressValidation.error);
      return getInvoicesFromLocalStorage(walletAddress, teamId);
    }

    const sanitizedAddress = addressValidation.sanitized!;

    // Use parameterized query (Supabase handles this, but we validate input)
    // Personal mode: only invoices WITHOUT a team_id
    const { data, error } = await client
      .from('invoices')
      .select('*')
      .or(`sender.eq.${sanitizedAddress},recipient.eq.${sanitizedAddress}`)
      .is('team_id', null);
    
    if (error) {
      console.error('Supabase error:', error);
      // Log more details for debugging
      if (error.message) {
        console.error('Error message:', error.message);
      }
      if (error.details) {
        console.error('Error details:', error.details);
      }
      if (error.hint) {
        console.error('Error hint:', error.hint);
      }
      return getInvoicesFromLocalStorage(walletAddress, teamId);
    }
    
    if (!data) return [];
    
    // Validate and sanitize all returned data
    const validInvoices: Invoice[] = [];
    for (const dbInvoice of data as InvoiceDB[]) {
      try {
        // Validate all fields before processing
        if (
          validateWalletAddress(dbInvoice.sender).valid &&
          validateWalletAddress(dbInvoice.recipient).valid &&
          validateInvoiceId(dbInvoice.id).valid &&
          validateStatus(dbInvoice.status).valid
        ) {
          validInvoices.push(toInvoice(dbInvoice));
        } else {
          console.warn('Skipping invalid invoice:', dbInvoice.id);
        }
      } catch (err) {
        console.warn('Error processing invoice:', dbInvoice.id, err);
      }
    }
    
    return validInvoices.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Failed to get invoices from Supabase:', error);
    return getInvoicesFromLocalStorage(walletAddress, teamId);
  }
}

async function getInvoiceFromSupabase(
  client: SupabaseClientType, 
  invoiceId: string
): Promise<Invoice | null> {
  try {
    // Validate invoice ID (security: prevent injection)
    const idValidation = validateInvoiceId(invoiceId);
    if (!idValidation.valid) {
      console.error('Invalid invoice ID:', idValidation.error);
      return getInvoiceFromLocalStorage(invoiceId);
    }

    const sanitizedId = idValidation.sanitized!;

    const { data, error } = await client
      .from('invoices')
      .select('*')
      .eq('id', sanitizedId)
      .single();
    
    if (error || !data) {
      return getInvoiceFromLocalStorage(invoiceId);
    }
    
    // Validate data before returning
    const dbInvoice = data as InvoiceDB;
    if (
      !validateWalletAddress(dbInvoice.sender).valid ||
      !validateWalletAddress(dbInvoice.recipient).valid ||
      !validateStatus(dbInvoice.status).valid
    ) {
      console.warn('Invalid invoice data:', invoiceId);
      return getInvoiceFromLocalStorage(invoiceId);
    }
    
    return toInvoice(dbInvoice);
  } catch (error) {
    console.error('Failed to get invoice from Supabase:', error);
    return getInvoiceFromLocalStorage(invoiceId);
  }
}

async function saveInvoiceToSupabase(
  client: SupabaseClientType, 
  invoice: Invoice
): Promise<Invoice> {
  try {
    // Validate all invoice fields (security: prevent injection/XSS)
    const senderValidation = validateWalletAddress(invoice.sender);
    const recipientValidation = validateWalletAddress(invoice.recipient);
    const idValidation = validateInvoiceId(invoice.id);
    const amountValidation = validateAmount(invoice.amount / 1_000_000_000); // Convert lamports to SOL
    const noteValidation = sanitizeNote(invoice.note || '');
    const statusValidation = validateStatus(invoice.status);
    const teamIdValidation = invoice.teamId ? validateTeamId(invoice.teamId) : { valid: true, sanitized: invoice.teamId };
    const createdByValidation = invoice.createdBy ? validateWalletAddress(invoice.createdBy) : { valid: true, sanitized: invoice.createdBy };

    if (!senderValidation.valid || !recipientValidation.valid || !idValidation.valid || 
        !amountValidation.valid || !noteValidation.valid || !statusValidation.valid ||
        !teamIdValidation.valid || !createdByValidation.valid) {
      console.error('Invalid invoice data:', {
        sender: senderValidation.error,
        recipient: recipientValidation.error,
        id: idValidation.error,
        amount: amountValidation.error,
        note: noteValidation.error,
        status: statusValidation.error,
        teamId: teamIdValidation.error,
        createdBy: createdByValidation.error,
      });
      return saveInvoiceToLocalStorage(invoice);
    }

    // Create sanitized invoice
    const sanitizedInvoice: Invoice = {
      ...invoice,
      sender: senderValidation.sanitized!,
      recipient: recipientValidation.sanitized!,
      id: idValidation.sanitized!,
      note: noteValidation.sanitized!,
      status: statusValidation.sanitized!,
      teamId: teamIdValidation.sanitized || undefined,
      createdBy: createdByValidation.sanitized || undefined,
    };

    // Validate tx signature if present
    if (sanitizedInvoice.txSignature) {
      const sigValidation = validateTxSignature(sanitizedInvoice.txSignature);
      if (!sigValidation.valid) {
        console.warn('Invalid transaction signature, removing:', sigValidation.error);
        sanitizedInvoice.txSignature = undefined;
      } else {
        sanitizedInvoice.txSignature = sigValidation.sanitized;
      }
    }

    const dbInvoice = toInvoiceDB(sanitizedInvoice);
    const { data, error } = await client
      .from('invoices')
      .insert(dbInvoice)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase insert error:', error);
      if (error.message) console.error('Error message:', error.message);
      if (error.details) console.error('Error details:', error.details);
      if (error.hint) console.error('Error hint:', error.hint);
      return saveInvoiceToLocalStorage(sanitizedInvoice);
    }
    
    // Also save to localStorage for offline access
    saveInvoiceToLocalStorage(sanitizedInvoice);
    
    return sanitizedInvoice;
  } catch (error) {
    console.error('Failed to save invoice to Supabase:', error);
    return saveInvoiceToLocalStorage(invoice);
  }
}

async function updateInvoiceInSupabase(
  client: SupabaseClientType, 
  invoiceId: string, 
  updates: Partial<Invoice>
): Promise<Invoice | null> {
  try {
    // Validate invoice ID
    const idValidation = validateInvoiceId(invoiceId);
    if (!idValidation.valid) {
      console.error('Invalid invoice ID:', idValidation.error);
      return updateInvoiceInLocalStorage(invoiceId, updates);
    }

    const sanitizedId = idValidation.sanitized!;
    const dbUpdates: Partial<InvoiceDB> = {};

    // Validate and sanitize each update field
    if (updates.status !== undefined) {
      const statusValidation = validateStatus(updates.status);
      if (!statusValidation.valid) {
        console.error('Invalid status:', statusValidation.error);
        return updateInvoiceInLocalStorage(invoiceId, updates);
      }
      dbUpdates.status = statusValidation.sanitized!;
    }

    if (updates.paidAt !== undefined) {
      // Validate date
      const paidAt = updates.paidAt instanceof Date 
        ? updates.paidAt 
        : new Date(updates.paidAt);
      
      if (isNaN(paidAt.getTime())) {
        console.error('Invalid date:', updates.paidAt);
        return updateInvoiceInLocalStorage(invoiceId, updates);
      }
      
      dbUpdates.paid_at = paidAt.toISOString();
    }

    if (updates.txSignature !== undefined) {
      const sigValidation = validateTxSignature(updates.txSignature);
      if (!sigValidation.valid) {
        console.error('Invalid transaction signature:', sigValidation.error);
        return updateInvoiceInLocalStorage(invoiceId, updates);
      }
      dbUpdates.tx_signature = sigValidation.sanitized!;
    }

    // Prevent updating sender/recipient (security: invoice ownership)
    // These should never change after creation
    
    const { error } = await client
      .from('invoices')
      .update(dbUpdates)
      .eq('id', sanitizedId);
    
    if (error) {
      console.error('Supabase update error:', error);
      if (error.message) console.error('Error message:', error.message);
      if (error.details) console.error('Error details:', error.details);
      return updateInvoiceInLocalStorage(invoiceId, updates);
    }
    
    // Also update localStorage
    updateInvoiceInLocalStorage(invoiceId, updates);
    
    return getInvoice(sanitizedId);
  } catch (error) {
    console.error('Failed to update invoice in Supabase:', error);
    return updateInvoiceInLocalStorage(invoiceId, updates);
  }
}

async function deleteInvoiceFromSupabase(
  client: SupabaseClientType, 
  invoiceId: string
): Promise<boolean> {
  try {
    // Validate invoice ID (security: prevent injection)
    const idValidation = validateInvoiceId(invoiceId);
    if (!idValidation.valid) {
      console.error('Invalid invoice ID:', idValidation.error);
      return deleteInvoiceFromLocalStorage(invoiceId);
    }

    const sanitizedId = idValidation.sanitized!;

    const { error } = await client
      .from('invoices')
      .delete()
      .eq('id', sanitizedId);
    
    if (error) {
      console.error('Supabase delete error:', error);
      if (error.message) console.error('Error message:', error.message);
      return deleteInvoiceFromLocalStorage(invoiceId);
    }
    
    // Also delete from localStorage
    deleteInvoiceFromLocalStorage(sanitizedId);
    
    return true;
  } catch (error) {
    console.error('Failed to delete invoice from Supabase:', error);
    return deleteInvoiceFromLocalStorage(invoiceId);
  }
}

// ============================================
// LocalStorage Operations (Fallback)
// ============================================

function getInvoicesFromLocalStorage(walletAddress: string, teamId?: string | null): Invoice[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) return [];
  
  try {
    const allInvoices = JSON.parse(stored) as Invoice[];
    return allInvoices
      .filter(inv => {
        // Team mode: only team invoices
        if (teamId) return inv.teamId === teamId;
        
        // Personal mode: only personal invoices (no team_id) for this wallet
        return (inv.sender === walletAddress || inv.recipient === walletAddress) && !inv.teamId;
      })
      .map(inv => ({
        ...inv,
        createdAt: new Date(inv.createdAt),
        paidAt: inv.paidAt ? new Date(inv.paidAt) : undefined,
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Failed to parse invoices from localStorage:', error);
    return [];
  }
}

function getInvoiceFromLocalStorage(invoiceId: string): Invoice | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) return null;
  
  try {
    const allInvoices = JSON.parse(stored) as Invoice[];
    const invoice = allInvoices.find(inv => inv.id === invoiceId);
    
    if (!invoice) return null;
    
    return {
      ...invoice,
      createdAt: new Date(invoice.createdAt),
      paidAt: invoice.paidAt ? new Date(invoice.paidAt) : undefined,
    };
  } catch (error) {
    console.error('Failed to get invoice from localStorage:', error);
    return null;
  }
}

function saveInvoiceToLocalStorage(invoice: Invoice): Invoice {
  if (typeof window === 'undefined') return invoice;
  
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  const allInvoices: Invoice[] = stored ? JSON.parse(stored) : [];
  
  // Add new invoice with serialized dates
  allInvoices.push({
    ...invoice,
    createdAt: invoice.createdAt instanceof Date 
      ? invoice.createdAt.toISOString() 
      : invoice.createdAt,
    paidAt: invoice.paidAt 
      ? (invoice.paidAt instanceof Date ? invoice.paidAt.toISOString() : invoice.paidAt)
      : undefined,
  } as unknown as Invoice);
  
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allInvoices));
  
  return invoice;
}

function updateInvoiceInLocalStorage(
  invoiceId: string, 
  updates: Partial<Invoice>
): Invoice | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) return null;
  
  try {
    const allInvoices = JSON.parse(stored) as Invoice[];
    const index = allInvoices.findIndex(inv => inv.id === invoiceId);
    
    if (index === -1) return null;
    
    // Apply updates
    allInvoices[index] = {
      ...allInvoices[index],
      ...updates,
      paidAt: updates.paidAt instanceof Date 
        ? updates.paidAt.toISOString() 
        : updates.paidAt,
    } as unknown as Invoice;
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allInvoices));
    
    return getInvoiceFromLocalStorage(invoiceId);
  } catch (error) {
    console.error('Failed to update invoice in localStorage:', error);
    return null;
  }
}

function deleteInvoiceFromLocalStorage(invoiceId: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) return false;
  
  try {
    const allInvoices = JSON.parse(stored) as Invoice[];
    const filtered = allInvoices.filter(inv => inv.id !== invoiceId);
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Failed to delete invoice from localStorage:', error);
    return false;
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if Supabase is configured and available
 */
export function isSupabaseConfigured(): boolean {
  return USE_SUPABASE;
}

/**
 * Get storage status
 */
export function getStorageStatus(): {
  provider: 'supabase' | 'localStorage';
  configured: boolean;
  url?: string;
} {
  return {
    provider: USE_SUPABASE ? 'supabase' : 'localStorage',
    configured: USE_SUPABASE,
    url: USE_SUPABASE ? SUPABASE_URL : undefined,
  };
}

/**
 * Sync localStorage invoices to Supabase (for migration)
 */
export async function syncLocalToSupabase(walletAddress: string): Promise<number> {
  const client = await getSupabaseClient();
  if (!client) return 0;
  
  const localInvoices = getInvoicesFromLocalStorage(walletAddress, null);
  let synced = 0;
  
  for (const invoice of localInvoices) {
    try {
      const dbInvoice = toInvoiceDB(invoice);
      await client.from('invoices').upsert(dbInvoice);
      synced++;
    } catch (error) {
      console.error('Failed to sync invoice:', invoice.id, error);
    }
  }
  
  return synced;
}
