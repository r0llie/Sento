// ============================================
// Sento - Invoice Detail Page
// ============================================

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { WalletButton } from '@/components/wallet/WalletButton';
import { formatLamportsToSol, formatAddress, formatDate, formatSignature, getExplorerTxUrl, getExplorerAddressUrl } from '@/lib/utils/format';
import { useActiveTeam, useInvoices, usePayment } from '@/lib/hooks';
import { PLATFORM_FEE_ENABLED, SENTO_FEE_PERCENTAGE } from '@/lib/solana/constants';
import type { Invoice } from '@/types';

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const { connected, publicKey } = useWallet();
  
  const { activeTeamId } = useActiveTeam();
  const isTeamMode = !!activeTeamId;
  const { getInvoice, updateInvoice } = useInvoices(activeTeamId);
  const { payInvoice, isPaying } = usePayment();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load invoice
  useEffect(() => {
    const found = getInvoice(invoiceId);
    if (found) {
      setInvoice(found);
    }
    setIsLoading(false);
  }, [invoiceId, getInvoice]);

  // Handle payment
  const handlePayInvoice = useCallback(async () => {
    if (!invoice || !publicKey) return;

    setError(null);

    const result = await payInvoice(invoice);

    if (result.success && result.signature) {
      // Update invoice status
      const updates = {
        status: 'paid' as const,
        paidAt: new Date(),
        txSignature: result.signature,
      };

      await updateInvoice(invoice.id, updates);
      setInvoice((prev) => (prev ? { ...prev, ...updates } : null));
    } else {
      setError(result.error || 'Payment failed. Please try again.');
    }
  }, [invoice, publicKey, payInvoice, updateInvoice]);

  // Copy link to clipboard
  const handleCopyLink = useCallback(() => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(`${window.location.origin}/invoice/${invoiceId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [invoiceId]);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Invoice Not Found
            </h2>
            <p className="text-gray-400 mb-6">
              This invoice doesn&apos;t exist or has been removed.
            </p>
            <Link href="/">
              <Button variant="secondary">Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaid = invoice.status === 'paid';
  const isOwner = publicKey?.toBase58() === invoice.sender;
  const isRecipient = publicKey?.toBase58() === invoice.recipient;
  const canViewAmount = connected && (isOwner || isRecipient);
  const feeLamports = PLATFORM_FEE_ENABLED
    ? Math.floor(invoice.amount * SENTO_FEE_PERCENTAGE)
    : 0;
  const totalLamports = invoice.amount + feeLamports;
  const feeRateLabel = `${(SENTO_FEE_PERCENTAGE * 100).toFixed(1)}%`;

  return (
    <div className="min-h-[80vh] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
            <span className="text-sm text-gray-400">Invoice</span>
            <span className="text-sm text-white font-mono">{invoice.id}</span>
          </div>
          <h1 className="text-3xl font-bold text-white">
            {invoice.note}
          </h1>
        </div>

        {/* Invoice Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Invoice Details</CardTitle>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isPaid
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                }`}
              >
                {isPaid ? 'Paid' : 'Unpaid'}
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Amount - Only visible to sender/recipient */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
              <p className="text-sm text-gray-400 mb-1">Amount</p>
              {canViewAmount ? (
                <p className="text-4xl font-bold text-white">
                  ◎ {formatLamportsToSol(invoice.amount)}
                </p>
              ) : (
                <p className="text-2xl font-bold text-gray-500">
                  🔒 Hidden
                </p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                {canViewAmount
                  ? 'Only you can see this amount'
                  : 'Connect wallet to view amount'}
              </p>
              {canViewAmount && feeLamports > 0 && PLATFORM_FEE_ENABLED && (
                <div className="mt-4 space-y-1 text-sm text-gray-400">
                  <div className="flex items-center justify-between">
                    <span>Platform fee ({feeRateLabel})</span>
                    <span className="font-mono">◎ {formatLamportsToSol(feeLamports)}</span>
                  </div>
                  <div className="flex items-center justify-between text-white">
                    <span>Total to pay</span>
                    <span className="font-mono">◎ {formatLamportsToSol(totalLamports)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">From</p>
                <p className="text-white font-mono text-sm">
                  {formatAddress(invoice.sender, 8)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">To</p>
                <p className="text-white font-mono text-sm">
                  {formatAddress(invoice.recipient, 8)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Created</p>
                <p className="text-white text-sm">
                  {formatDate(invoice.createdAt)}
                </p>
              </div>
              {isPaid && invoice.paidAt && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Paid</p>
                  <p className="text-white text-sm">
                    {formatDate(invoice.paidAt)}
                  </p>
                </div>
              )}
            </div>

            {/* Transaction Link */}
            {isPaid && invoice.txSignature && (
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-sm text-gray-400 mb-3">Transaction Details</p>
                <div className="space-y-3">
                  {/* Transaction Signature */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-500">Signature</span>
                    <span className="text-emerald-400 text-sm font-mono">
                      {formatSignature(invoice.txSignature, 12)}
                    </span>
                  </div>
                  
                  {/* Explorer Links */}
                  {!invoice.txSignature.startsWith('demo_') && (
                    <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                      <a
                        href={getExplorerTxUrl(invoice.txSignature)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View on Solana Explorer
                      </a>
                    </div>
                  )}
                  
                  {/* Privacy Note */}
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Amount is hidden on-chain (ZK Compressed)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Notice */}
            <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <div className="flex gap-3">
                <svg
                  className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-emerald-400">
                    ZK Privacy Enabled
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Payment amounts are hidden using zero-knowledge proofs
                  </p>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex-col gap-4">
            {!connected ? (
              <div className="w-full text-center">
                <p className="text-gray-400 mb-4">
                  Connect your wallet to pay this invoice
                </p>
                <WalletButton />
              </div>
            ) : isPaid ? (
              <div className="w-full text-center">
                <div className="inline-flex items-center gap-2 text-emerald-400">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>This invoice has been paid</span>
                </div>
              </div>
            ) : isTeamMode ? (
              <div className="w-full text-center">
                <div className="inline-flex items-center gap-2 text-yellow-400">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v3m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z"
                    />
                  </svg>
                  <span>Team mode can’t move funds. Switch to Personal to pay.</span>
                </div>
              </div>
            ) : (
              <Button
                size="lg"
                className="w-full"
                onClick={handlePayInvoice}
                isLoading={isPaying}
              >
                Pay Privately
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Share Link */}
        {!isPaid && isOwner && (
          <Card className="mt-6">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-400 mb-1">Share this link</p>
                  <p className="text-white text-sm font-mono truncate">
                    {typeof window !== 'undefined'
                      ? `${window.location.origin}/invoice/${invoice.id}`
                      : ''}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyLink}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back link */}
        <div className="mt-6 text-center">
          <Link href="/balance" className="text-gray-400 hover:text-white text-sm transition-colors">
            ← Back to Balance
          </Link>
        </div>
      </div>
    </div>
  );
}
