// ============================================
// Sento - Create Invoice Tab
// Full-featured invoice creation form
// ============================================

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { isValidPublicKey, parseInputToLamports, formatLamportsToSol } from '@/lib/utils/format';
import { PLATFORM_FEE_ENABLED, SENTO_FEE_PERCENTAGE } from '@/lib/solana/constants';
import { useActiveTeam, useInvoices, useTeams } from '@/lib/hooks';

export default function CreateInvoiceTab() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const { activeTeamId } = useActiveTeam();
  const { getTeamById, getMyRole } = useTeams();
  const activeTeam = getTeamById(activeTeamId);
  const myRole = getMyRole(activeTeamId);
  const canCreate = !activeTeamId || myRole === 'creator';
  const { createInvoice } = useInvoices(activeTeamId);
  
  const [formData, setFormData] = useState({
    recipient: '',
    amount: '',
    note: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.recipient) {
      newErrors.recipient = 'Recipient address is required';
    } else if (!isValidPublicKey(formData.recipient)) {
      newErrors.recipient = 'Invalid Solana address';
    } else if (formData.recipient === publicKey?.toBase58()) {
      newErrors.recipient = 'Cannot send invoice to yourself';
    }

    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else {
      const lamports = parseInputToLamports(formData.amount);
      if (lamports === null || lamports <= 0) {
        newErrors.amount = 'Invalid amount';
      } else if (lamports < 1000) {
        newErrors.amount = 'Minimum amount is 0.000001 SOL';
      }
    }

    if (!formData.note.trim()) {
      newErrors.note = 'Note is required';
    } else if (formData.note.length > 200) {
      newErrors.note = 'Note must be less than 200 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, publicKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !publicKey || !canCreate) return;

    setIsLoading(true);

    try {
      const lamports = parseInputToLamports(formData.amount);
      if (lamports === null) throw new Error('Invalid amount');

      const invoice = await createInvoice({
        recipient: formData.recipient,
        amount: lamports,
        note: formData.note.trim(),
      });

      router.push(`/invoice/${invoice.id}`);
    } catch (error) {
      console.error('Failed to create invoice:', error);
      setErrors({ 
        submit: error instanceof Error 
          ? error.message 
          : 'Failed to create invoice. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate preview
  const previewAmount = formData.amount ? parseInputToLamports(formData.amount) : null;
  const fee = PLATFORM_FEE_ENABLED && previewAmount
    ? Math.floor(previewAmount * SENTO_FEE_PERCENTAGE)
    : 0;
  const feeRateLabel = `${(SENTO_FEE_PERCENTAGE * 100).toFixed(1)}%`;

  if (!canCreate) {
    return (
      <Card padding="md">
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-[rgba(245,158,11,0.08)] flex items-center justify-center">
            <svg className="w-5 h-5 text-[#F5A623]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="text-[15px] font-medium text-[#FAFAFA] mb-2">Viewer Access Only</h3>
          <p className="text-[12px] text-[#52525B]">
            You don&apos;t have permission to create invoices for team &ldquo;{activeTeam?.name}&rdquo;
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-[640px] mx-auto">
      {/* Team Badge */}
      {activeTeam && (
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[rgba(91,185,140,0.08)] border border-[rgba(91,185,140,0.15)] text-[12px] font-medium text-[#5BB98C]">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {activeTeam.name}
        </div>
      )}

      {/* Form Card */}
      <Card padding="none">
        <form onSubmit={handleSubmit}>
          {/* Form fields */}
          <div className="p-6 space-y-5">
            {/* Recipient */}
            <Input
              label="Recipient Wallet"
              placeholder="Enter Solana wallet address"
              value={formData.recipient}
              onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
              error={errors.recipient}
              hint="The wallet that will receive this payment"
            />

            {/* Amount */}
            <Input
              label="Amount"
              type="number"
              step="0.000000001"
              min="0"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              error={errors.amount}
              leftAddon={<span className="text-[15px] text-[#5F6167]">◎</span>}
              hint="SOL amount — will be encrypted on-chain"
            />

            {/* Note */}
            <Textarea
              label="Description"
              placeholder="e.g., Invoice for consulting services"
              rows={3}
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              error={errors.note}
              hint={`${formData.note.length}/200 characters`}
            />

            {/* Summary */}
            {previewAmount && previewAmount > 0 && (
              <div className="p-4 rounded-lg bg-[#111113] border border-[rgba(255,255,255,0.04)]">
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-[12px] text-[#52525B]">Invoice Amount</span>
                  <span className="text-[13px] text-[#FAFAFA] font-mono">{formatLamportsToSol(previewAmount)} SOL</span>
                </div>
                {PLATFORM_FEE_ENABLED && (
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-[12px] text-[#52525B]">Platform Fee ({feeRateLabel})</span>
                    <span className="text-[12px] text-[#52525B] font-mono">{formatLamportsToSol(fee)} SOL</span>
                  </div>
                )}
                <div className="pt-3 border-t border-[rgba(255,255,255,0.04)] flex justify-between items-center">
                  <span className="text-[13px] font-medium text-[#71717A]">Total to Pay</span>
                  <span className="text-[16px] font-medium text-[#5ED9B3] font-mono">
                    {formatLamportsToSol(previewAmount + fee)} SOL
                  </span>
                </div>
              </div>
            )}

            {/* Error */}
            {errors.submit && (
              <div className="p-3 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)]">
                <p className="text-[12px] text-[#EF4444]">{errors.submit}</p>
              </div>
            )}
          </div>

          {/* Privacy notice */}
          <div className="mx-6 mb-6">
            <div className="p-4 rounded-lg bg-[rgba(94,217,179,0.04)] border border-[rgba(94,217,179,0.1)]">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-md bg-[rgba(94,217,179,0.1)] flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[#5ED9B3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[#5ED9B3] mb-1">
                    Privacy Protected
                  </p>
                  <p className="text-[11px] text-[#52525B] leading-[1.5]">
                    Payment amounts are encrypted using zero-knowledge proofs. 
                    Only you and the payer can see the actual amount.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="px-6 pb-6">
            <Button
              type="submit"
              size="lg"
              fullWidth
              isLoading={isLoading}
              disabled={!canCreate}
            >
              Create Invoice
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
