// ============================================
// Sento - Batch Payment Hook
// ============================================

'use client';

import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  compressSOL as lpCompressSOL,
  transferCompressedSOL,
  getCompressedBalance,
} from '../solana/light-protocol';
import { RPC_ENDPOINT } from '../solana/constants';
import { parseError, logError, SentoError } from '../utils/errors';
import { isValidPublicKey, generateInvoiceId } from '../utils/format';
import { saveBatchPayment } from '../storage/batch-payments';
import { saveInvoice } from '../storage/supabase';
import { generateBatchId, generateBatchRecipientId } from '../utils/format';
import type { BatchPayment, BatchRecipient, TransactionResult, Invoice } from '@/types';

interface BatchRecipientInput {
  wallet: string;
  amount: number; // lamports
  note?: string;
}

interface ExecuteBatchOptions {
  recipients: BatchRecipientInput[];
  teamId?: string | null;
  proofHash?: string;
}

interface UseBatchPaymentReturn {
  executeBatch: (options: ExecuteBatchOptions) => Promise<BatchPayment | null>;
  isProcessing: boolean;
  error: Error | null;
}

export function useBatchPayment(): UseBatchPaymentReturn {
  const { publicKey, signTransaction, connected } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const executeBatch = useCallback(
    async ({ recipients, teamId, proofHash }: ExecuteBatchOptions): Promise<BatchPayment | null> => {
      if (!publicKey || !connected || !signTransaction) {
        const sentoError = new SentoError('WALLET_NOT_CONNECTED');
        setError(sentoError);
        return null;
      }

      setIsProcessing(true);
      setError(null);

      try {
        const sanitizedRecipients = recipients.filter(
          (recipient) => recipient.amount > 0 && isValidPublicKey(recipient.wallet)
        );
        if (sanitizedRecipients.length === 0) {
          throw new SentoError('INVALID_ADDRESS');
        }

        const totalLamports = sanitizedRecipients.reduce((sum, r) => sum + r.amount, 0);
        const amountLamports = BigInt(totalLamports);

        // Reserve SOL for transaction fees (0.01 SOL = 10_000_000 lamports)
        const FEE_RESERVE = 0.01 * 1_000_000_000;

        let compressedBalance = await getCompressedBalance(publicKey);
        if (compressedBalance < amountLamports) {
          const shortfallLamports = amountLamports - compressedBalance;
          const amountToCompressLamports = Number(shortfallLamports);
          const amountToCompressSOL = amountToCompressLamports / 1_000_000_000;

          const connection = new Connection(RPC_ENDPOINT);
          const walletBalance = await connection.getBalance(publicKey);

          const totalNeeded = amountToCompressLamports + FEE_RESERVE;
          if (walletBalance < totalNeeded) {
            throw new SentoError('INSUFFICIENT_BALANCE', undefined, {
              walletBalance: walletBalance / 1_000_000_000,
              needed: totalNeeded / 1_000_000_000,
            });
          }

          await lpCompressSOL(publicKey, amountToCompressSOL, signTransaction);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          compressedBalance = await getCompressedBalance(publicKey);
        }

        const batchRecipients: BatchRecipient[] = sanitizedRecipients.map((recipient) => ({
          id: generateBatchRecipientId(),
          wallet: recipient.wallet,
          amount: recipient.amount,
          note: recipient.note,
          status: 'pending',
        }));

        // Process payments with retry logic for queue issues
        for (const recipient of batchRecipients) {
          try {
            const recipientPubkey = new PublicKey(recipient.wallet);
            
            // Retry logic for Light Protocol queue issues (error 0x232a)
            let attempts = 0;
            const maxAttempts = 3;
            let lastError;
            
            while (attempts < maxAttempts) {
              try {
                const signature = await transferCompressedSOL(
                  publicKey,
                  recipientPubkey,
                  recipient.amount,
                  signTransaction
                );
                recipient.status = 'paid';
                recipient.txSignature = signature;
                break; // Success, exit retry loop
              } catch (transferErr: any) {
                lastError = transferErr;
                attempts++;
                
                // Check if it's a queue issue (0x232a / 9002)
                const errorStr = transferErr?.message || String(transferErr);
                const isQueueIssue = errorStr.includes('0x232a') || errorStr.includes('9002');
                
                if (isQueueIssue && attempts < maxAttempts) {
                  console.warn(`Queue issue on attempt ${attempts}/${maxAttempts}, retrying in ${attempts * 2}s...`);
                  await new Promise(resolve => setTimeout(resolve, attempts * 2000)); // Exponential backoff
                } else {
                  throw transferErr; // Not a queue issue or max attempts reached
                }
              }
            }
            
            // If we exhausted all attempts, throw the last error
            if (recipient.status !== 'paid') {
              throw lastError;
            }
            
          } catch (err) {
            logError(err, { operation: 'batch_transfer', recipient: recipient.wallet });
            const sentoError = parseError(err);
            recipient.status = 'failed';
            recipient.error = sentoError.userMessage;
          }
          
          // Small delay between recipients to avoid overwhelming the queue
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        const status = batchRecipients.every((r) => r.status === 'paid')
          ? 'completed'
          : batchRecipients.some((r) => r.status === 'paid')
            ? 'partial'
            : 'failed';

        const batch: BatchPayment = {
          id: generateBatchId(),
          creatorWallet: publicKey.toBase58(),
          teamId: teamId || undefined,
          totalAmount: totalLamports,
          proofHash,
          status,
          createdAt: new Date(),
          recipients: batchRecipients,
        };

        await saveBatchPayment(batch);
        
        // Create invoices for successful payments
        // This makes batch payments appear in reports
        const successfulRecipients = batchRecipients.filter(r => r.status === 'paid');
        if (successfulRecipients.length > 0) {
          console.log(`Creating ${successfulRecipients.length} invoices from batch payment...`);
          
          for (const recipient of successfulRecipients) {
            try {
              const invoice: Invoice = {
                id: generateInvoiceId(),
                sender: publicKey.toBase58(),
                recipient: recipient.wallet,
                amount: recipient.amount,
                note: recipient.note 
                  ? `Batch payment: ${recipient.note}` 
                  : `Batch payment (${new Date().toLocaleDateString()})`,
                status: 'paid', // Already paid via batch
                teamId: teamId || undefined,
                createdBy: teamId ? publicKey.toBase58() : undefined,
                createdAt: new Date(),
                paidAt: new Date(), // Paid immediately
                txSignature: recipient.txSignature,
              };
              
              await saveInvoice(invoice);
              console.log(`✓ Invoice created for ${recipient.wallet.slice(0, 8)}...`);
            } catch (invoiceErr) {
              // Don't fail the batch if invoice creation fails
              console.warn('Failed to create invoice for recipient:', recipient.wallet, invoiceErr);
            }
          }
          
          console.log(`✓ Batch payment complete with ${successfulRecipients.length} invoices created`);
        }
        
        return batch;
      } catch (err) {
        logError(err, { operation: 'execute_batch' });
        const sentoError = parseError(err);
        setError(sentoError);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [publicKey, connected, signTransaction]
  );

  return { executeBatch, isProcessing, error };
}

export default useBatchPayment;
