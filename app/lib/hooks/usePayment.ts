// ============================================
// Sento - Payment Hook
// Complete Light Protocol integration for private payments
// ============================================

'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Connection } from '@solana/web3.js';
import {
  compressSOL as lpCompressSOL,
  decompressSOL as lpDecompressSOL,
  transferCompressedSOL,
  getCompressedBalance,
} from '../solana/light-protocol';
import { RPC_ENDPOINT, PLATFORM_FEE_WALLET, PLATFORM_FEE_ENABLED, SENTO_FEE_PERCENTAGE } from '../solana/constants';
import { parseError, logError, SentoError } from '../utils/errors';
import { isValidPublicKey } from '../utils/format';
import type { TransactionResult, Invoice } from '@/types';

interface UsePaymentReturn {
  payInvoice: (invoice: Invoice) => Promise<TransactionResult>;
  compressSOL: (amount: number) => Promise<TransactionResult>;
  decompressSOL: (amount: number) => Promise<TransactionResult>;
  isPaying: boolean;
  isCompressing: boolean;
  error: Error | null;
}

/**
 * Hook to handle private payments via Light Protocol
 */
export function usePayment(): UsePaymentReturn {
  const { publicKey, signTransaction, connected } = useWallet();
  const [isPaying, setIsPaying] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Compress SOL into private balance
   * This hides your balance from public explorers
   */
  const compressSOL = useCallback(
    async (amount: number): Promise<TransactionResult> => {
      if (!publicKey || !connected || !signTransaction) {
        const sentoError = new SentoError('WALLET_NOT_CONNECTED');
        return { success: false, error: sentoError.userMessage };
      }

      setIsCompressing(true);
      setError(null);

      try {
        const signature = await lpCompressSOL(publicKey, amount, signTransaction);

        console.log('SOL compressed successfully:', { amount, signature });
        return { success: true, signature };
      } catch (err) {
        logError(err, { operation: 'compress', amount });
        const sentoError = parseError(err);
        setError(sentoError);
        return { success: false, error: sentoError.userMessage };
      } finally {
        setIsCompressing(false);
      }
    },
    [publicKey, connected, signTransaction]
  );

  /**
   * Decompress SOL (claim) - convert private balance back to regular SOL
   */
  const decompressSOL = useCallback(
    async (amount: number): Promise<TransactionResult> => {
      if (!publicKey || !connected || !signTransaction) {
        const sentoError = new SentoError('WALLET_NOT_CONNECTED');
        return { success: false, error: sentoError.userMessage };
      }

      setIsCompressing(true);
      setError(null);

      try {
        const signature = await lpDecompressSOL(publicKey, amount, signTransaction);

        console.log('SOL decompressed (claimed) successfully:', { amount, signature });
        return { success: true, signature };
      } catch (err) {
        logError(err, { operation: 'decompress', amount });
        const sentoError = parseError(err);
        setError(sentoError);
        return { success: false, error: sentoError.userMessage };
      } finally {
        setIsCompressing(false);
      }
    },
    [publicKey, connected, signTransaction]
  );

  /**
   * Pay invoice - Auto-compress if needed, then private transfer
   * Always ensures payment is private (no regular transfer)
   */
  const payInvoice = useCallback(
    async (invoice: Invoice): Promise<TransactionResult> => {
      if (!publicKey || !connected || !signTransaction) {
        const sentoError = new SentoError('WALLET_NOT_CONNECTED');
        return { success: false, error: sentoError.userMessage };
      }

      setIsPaying(true);
      setError(null);

      try {
        const recipientPubkey = new PublicKey(invoice.recipient);
        const feeLamports = PLATFORM_FEE_ENABLED
          ? Math.floor(invoice.amount * SENTO_FEE_PERCENTAGE)
          : 0;
        const totalLamports = invoice.amount + feeLamports;
        const amountLamports = BigInt(totalLamports);
        
        // Reserve SOL for transaction fees (0.01 SOL = 10_000_000 lamports)
        const FEE_RESERVE = 0.01 * 1_000_000_000;

        // Check compressed balance
        let compressedBalance = await getCompressedBalance(publicKey);
        
        // Auto-compress if not enough compressed SOL
        if (compressedBalance < amountLamports) {
          const shortfallLamports = amountLamports - compressedBalance;
          const amountToCompressLamports = Number(shortfallLamports);
          const amountToCompressSOL = amountToCompressLamports / 1_000_000_000;
          
          // Get wallet balance to check if we have enough
          const connection = new Connection(RPC_ENDPOINT);
          const walletBalance = await connection.getBalance(publicKey);
          
          // Check if wallet has enough (amount + fees)
          const totalNeeded = amountToCompressLamports + FEE_RESERVE;
          if (walletBalance < totalNeeded) {
            throw new SentoError('INSUFFICIENT_BALANCE', undefined, {
              walletBalance: walletBalance / 1_000_000_000,
              needed: totalNeeded / 1_000_000_000,
            });
          }
          
          console.log(`Auto-compressing ${amountToCompressSOL.toFixed(4)} SOL for private payment...`);
          
          // Compress the needed amount
          await lpCompressSOL(publicKey, amountToCompressSOL, signTransaction);
          
          // Wait a moment for indexer to catch up
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Refresh compressed balance
          compressedBalance = await getCompressedBalance(publicKey);
          console.log(`Compressed balance after auto-compress: ${Number(compressedBalance) / 1_000_000_000} SOL`);
        }

        let feeRecipient: PublicKey | null = null;
        if (feeLamports > 0) {
          if (!PLATFORM_FEE_WALLET || !isValidPublicKey(PLATFORM_FEE_WALLET)) {
            throw new SentoError('INVALID_ADDRESS');
          }
          feeRecipient = new PublicKey(PLATFORM_FEE_WALLET);
        }

        // Use private compressed transfer
        console.log('Using private compressed transfer');
        
        const signature = await transferCompressedSOL(
          publicKey,
          recipientPubkey,
          invoice.amount,
          signTransaction
        );

        // Transfer platform fee if configured
        if (feeLamports > 0 && feeRecipient) {
          await transferCompressedSOL(
            publicKey,
            feeRecipient,
            feeLamports,
            signTransaction
          );
        }

        console.log('Private payment successful:', {
          from: publicKey.toBase58(),
          to: invoice.recipient,
          amount: invoice.amount,
          fee: feeLamports,
          total: totalLamports,
          signature,
          type: 'compressed_transfer',
        });

        return { success: true, signature };
      } catch (err) {
        logError(err, { operation: 'payInvoice', invoiceId: invoice.id });
        const sentoError = parseError(err);
        setError(sentoError);
        return { success: false, error: sentoError.userMessage };
      } finally {
        setIsPaying(false);
      }
    },
    [publicKey, connected, signTransaction]
  );

  return {
    payInvoice,
    compressSOL,
    decompressSOL,
    isPaying,
    isCompressing,
    error,
  };
}

export default usePayment;
