// ============================================
// Sento - Invoices Hook
// Supports both localStorage and Supabase storage
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { generateInvoiceId } from '../utils/format';
import {
  getInvoices as fetchInvoices,
  getInvoice as fetchInvoice,
  saveInvoice as persistInvoice,
  updateInvoice as persistUpdate,
  deleteInvoice as persistDelete,
  getStorageStatus,
} from '../storage/supabase';
import type { Invoice, CreateInvoiceData } from '@/types';

interface UseInvoicesReturn {
  invoices: Invoice[];
  isLoading: boolean;
  error: Error | null;
  createInvoice: (data: CreateInvoiceData) => Promise<Invoice>;
  getInvoice: (id: string) => Invoice | undefined;
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  storageProvider: 'supabase' | 'localStorage';
}

/**
 * Hook to manage invoices
 * Uses Supabase if configured, falls back to localStorage
 */
export function useInvoices(teamId?: string | null): UseInvoicesReturn {
  const { publicKey, connected } = useWallet();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const storageStatus = getStorageStatus();

  // Load invoices from storage
  const loadInvoices = useCallback(async () => {
    if (!publicKey) {
      setInvoices([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const walletAddress = publicKey.toBase58();
      const loadedInvoices = await fetchInvoices(walletAddress, teamId);
      setInvoices(loadedInvoices);
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setError(err instanceof Error ? err : new Error('Failed to load invoices'));
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, teamId]);

  // Initial load
  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Create new invoice
  const createInvoice = useCallback(
    async (data: CreateInvoiceData): Promise<Invoice> => {
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      const invoice: Invoice = {
        id: generateInvoiceId(),
        sender: publicKey.toBase58(),
        recipient: data.recipient,
        amount: data.amount,
        note: data.note,
        status: 'unpaid',
        teamId: teamId || undefined,
        createdBy: teamId ? publicKey.toBase58() : undefined,
        createdAt: new Date(),
      };

      // Save to storage (Supabase or localStorage)
      const savedInvoice = await persistInvoice(invoice);

      // Update state
      setInvoices((prev) => [savedInvoice, ...prev]);

      return savedInvoice;
    },
    [publicKey, teamId]
  );

  // Get single invoice (from state or storage)
  const getInvoice = useCallback(
    (id: string): Invoice | undefined => {
      // Check local state first
      const fromState = invoices.find((inv) => inv.id === id);
      if (fromState) return fromState;
      
      // Note: For async fetch, use getInvoiceAsync instead
      return undefined;
    },
    [invoices]
  );

  // Update invoice
  const updateInvoice = useCallback(
    async (id: string, updates: Partial<Invoice>): Promise<void> => {
      // Update in storage
      await persistUpdate(id, updates);

      // Update state
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === id ? { ...inv, ...updates } : inv
        )
      );
    },
    []
  );

  // Delete invoice
  const deleteInvoice = useCallback(async (id: string): Promise<void> => {
    // Delete from storage
    await persistDelete(id);

    // Update state
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  }, []);

  return {
    invoices,
    isLoading,
    error,
    createInvoice,
    getInvoice,
    updateInvoice,
    deleteInvoice,
    refresh: loadInvoices,
    storageProvider: storageStatus.provider,
  };
}

/**
 * Async function to get a single invoice by ID
 * Use when you need to fetch from storage directly
 */
export async function getInvoiceAsync(id: string): Promise<Invoice | null> {
  return fetchInvoice(id);
}

export default useInvoices;
