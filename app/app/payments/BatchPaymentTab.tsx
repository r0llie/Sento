// ============================================
// Sento - Batch Payment Tab
// Full-featured batch payment creation
// ============================================

'use client';

import { useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useActiveTeam, useBatchPayment, useCompliance, useTeams } from '@/lib/hooks';
import { formatLamportsToSol, generateBatchRecipientId, isValidPublicKey, parseInputToLamports } from '@/lib/utils/format';
import type { BatchPayment } from '@/types';

interface BatchRow {
  id: string;
  wallet: string;
  amount: string;
  note: string;
  error?: string;
}

export default function BatchPaymentTab() {
  const { activeTeamId } = useActiveTeam();
  const { getTeamById, getMyRole } = useTeams();
  const activeTeam = getTeamById(activeTeamId);
  const myRole = getMyRole(activeTeamId);
  const canExecute = !activeTeamId || myRole === 'creator';
  const { executeBatch, isProcessing, error } = useBatchPayment();
  const { isEnabled, proof } = useCompliance();

  const [rows, setRows] = useState<BatchRow[]>([
    { id: generateBatchRecipientId(), wallet: '', amount: '', note: '' },
  ]);
  const [result, setResult] = useState<BatchPayment | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  const totalLamports = useMemo(() => {
    return rows.reduce((sum, row) => {
      const lamports = parseInputToLamports(row.amount);
      return lamports ? sum + lamports : sum;
    }, 0);
  }, [rows]);

  const addRow = () => {
    setRows((prev) => [...prev, { id: generateBatchRecipientId(), wallet: '', amount: '', note: '' }]);
  };

  const removeRow = (rowId: string) => {
    setRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  const updateRow = (rowId: string, updates: Partial<BatchRow>) => {
    setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...updates } : row)));
  };

  const handleCsvUpload = (file: File | null) => {
    if (!file) return;
    setCsvError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
        const parsedRows: BatchRow[] = [];
        for (const line of lines) {
          const [wallet, amount, note] = line.split(',').map((cell) => cell.trim());
          if (!wallet || !amount) continue;
          parsedRows.push({
            id: generateBatchRecipientId(),
            wallet,
            amount,
            note: note || '',
          });
        }
        if (parsedRows.length === 0) {
          setCsvError('No valid rows found in CSV.');
          return;
        }
        setRows(parsedRows);
      } catch (err) {
        console.error('CSV parse failed:', err);
        setCsvError('Failed to parse CSV. Expected: wallet, amount, note');
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!canExecute) return;
    setResult(null);

    let hasErrors = false;
    const nextRows = rows.map((row) => {
      const lamports = parseInputToLamports(row.amount);
      if (!row.wallet || !isValidPublicKey(row.wallet)) {
        hasErrors = true;
        return { ...row, error: 'Invalid wallet' };
      }
      if (!lamports || lamports <= 0) {
        hasErrors = true;
        return { ...row, error: 'Invalid amount' };
      }
      return { ...row, error: undefined };
    });
    setRows(nextRows);
    if (hasErrors) return;

    const recipients = nextRows.map((row) => ({
      wallet: row.wallet,
      amount: parseInputToLamports(row.amount) || 0,
      note: row.note || undefined,
    }));

    const batch = await executeBatch({
      recipients,
      teamId: activeTeamId || undefined,
      proofHash: isEnabled ? proof?.result.proofHash : undefined,
    });
    setResult(batch);
  };

  if (!canExecute) {
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
            You don&apos;t have permission to create batch payments for team &ldquo;{activeTeam?.name}&rdquo;
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto">
      {/* Team Badge */}
      {activeTeam && (
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[rgba(91,185,140,0.08)] border border-[rgba(91,185,140,0.15)] text-[12px] font-medium text-[#5BB98C]">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {activeTeam.name}
        </div>
      )}
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-lg bg-[#111113] border border-[rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded flex items-center justify-center bg-[rgba(94,217,179,0.12)]">
              <svg className="w-3 h-3 text-[#5ED9B3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-[10px] text-[#52525B] uppercase tracking-[0.06em]">Recipients</span>
          </div>
          <p className="text-[16px] font-medium text-[#71717A] font-mono">{rows.length}</p>
        </div>
        <div className="p-4 rounded-lg bg-[#111113] border border-[rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded flex items-center justify-center bg-[rgba(94,217,179,0.12)]">
              <svg className="w-3 h-3 text-[#5ED9B3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-[10px] text-[#52525B] uppercase tracking-[0.06em]">Total</span>
          </div>
          <p className="text-[16px] font-medium text-[#71717A] font-mono">{formatLamportsToSol(totalLamports)} SOL</p>
        </div>
        <div className="p-4 rounded-lg bg-[#111113] border border-[rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded flex items-center justify-center bg-[rgba(94,217,179,0.12)]">
              <svg className="w-3 h-3 text-[#5ED9B3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="text-[10px] text-[#52525B] uppercase tracking-[0.06em]">Status</span>
          </div>
          <p className="text-[16px] font-medium text-[#5ED9B3]">Ready</p>
        </div>
      </div>

      {/* Recipients Table */}
      <Card padding="none">
        <div className="p-4 border-b border-[rgba(255,255,255,0.04)] flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-medium text-[#FAFAFA] mb-0.5">Recipients</h2>
            <p className="text-[11px] text-[#52525B]">Add wallet addresses and payment amounts</p>
          </div>
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] text-[11px] font-medium text-[#71717A] hover:text-[#FAFAFA] cursor-pointer transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => handleCsvUpload(e.target.files?.[0] || null)}
            />
          </label>
        </div>
        
        <div className="p-4 space-y-3">
          {rows.map((row, index) => (
            <div key={row.id} className="p-4 rounded-lg bg-[#111113] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)] transition-colors">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                <div className="lg:col-span-5">
                  <label className="block text-[10px] font-medium text-[#52525B] uppercase tracking-wider mb-1.5">
                    Recipient {index + 1}
                  </label>
                  <input
                    placeholder="Solana wallet address"
                    value={row.wallet}
                    onChange={(e) => updateRow(row.id, { wallet: e.target.value })}
                    className={`
                      w-full px-3 py-2 rounded-md bg-[#0D0E10] text-[12px] font-mono text-[#E4E4E7] 
                      border transition-colors
                      ${row.error === 'Invalid wallet' 
                        ? 'border-[#EF4444] focus:border-[#EF4444]' 
                        : 'border-[rgba(255,255,255,0.06)] focus:border-[rgba(255,255,255,0.12)]'
                      }
                      focus:outline-none
                    `}
                  />
                  {row.error === 'Invalid wallet' && (
                    <p className="text-[10px] text-[#EF4444] mt-1">Invalid wallet address</p>
                  )}
                </div>
                
                <div className="lg:col-span-2">
                  <label className="block text-[10px] font-medium text-[#52525B] uppercase tracking-wider mb-1.5">
                    Amount (SOL)
                  </label>
                  <input
                    type="number"
                    step="0.000000001"
                    min="0"
                    placeholder="0.00"
                    value={row.amount}
                    onChange={(e) => updateRow(row.id, { amount: e.target.value })}
                    className={`
                      w-full px-3 py-2 rounded-md bg-[#0D0E10] text-[12px] font-mono text-[#E4E4E7] 
                      border transition-colors
                      ${row.error === 'Invalid amount' 
                        ? 'border-[#EF4444] focus:border-[#EF4444]' 
                        : 'border-[rgba(255,255,255,0.06)] focus:border-[rgba(255,255,255,0.12)]'
                      }
                      focus:outline-none
                    `}
                  />
                  {row.error === 'Invalid amount' && (
                    <p className="text-[10px] text-[#EF4444] mt-1">Invalid amount</p>
                  )}
                </div>
                
                <div className="lg:col-span-4">
                  <label className="block text-[10px] font-medium text-[#52525B] uppercase tracking-wider mb-1.5">
                    Note (Optional)
                  </label>
                  <input
                    placeholder="Payment description"
                    value={row.note}
                    onChange={(e) => updateRow(row.id, { note: e.target.value })}
                    className="w-full px-3 py-2 rounded-md bg-[#0D0E10] border border-[rgba(255,255,255,0.06)] text-[12px] text-[#E4E4E7] focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition-colors"
                  />
                </div>
                
                <div className="lg:col-span-1 flex items-end">
                  {rows.length > 1 && (
                    <button
                      onClick={() => removeRow(row.id)}
                      className="w-full lg:w-auto px-3 py-2 rounded-md bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] text-[#EF4444] hover:bg-[rgba(239,68,68,0.12)] transition-colors text-[11px] font-medium"
                    >
                      <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          <button
            onClick={addRow}
            className="w-full py-3 rounded-lg border-2 border-dashed border-[rgba(255,255,255,0.08)] text-[12px] font-medium text-[#71717A] hover:border-[rgba(255,255,255,0.15)] hover:text-[#FAFAFA] transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add another recipient
          </button>
          
          {csvError && (
            <div className="p-3 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] flex items-start gap-2">
              <svg className="w-4 h-4 text-[#EF4444] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[12px] text-[#EF4444]">{csvError}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Summary & Execute */}
      <div className="mt-6 space-y-4">
        {/* Warnings */}
        {!canExecute && (
          <div className="p-4 rounded-lg bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.15)] flex items-start gap-3">
            <svg className="w-5 h-5 text-[#F5A623] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-[13px] font-medium text-[#F5A623] mb-0.5">View-only access</p>
              <p className="text-[12px] text-[#A1A1AA]">
                You have view-only permissions for this team. Switch to Personal to execute payments.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] flex items-start gap-3">
            <svg className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-[13px] font-medium text-[#EF4444] mb-0.5">Transaction failed</p>
              <p className="text-[12px] text-[#A1A1AA]">{error.message}</p>
            </div>
          </div>
        )}

        {/* Execute Button Card */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] text-[#52525B] uppercase tracking-[0.06em] mb-1.5">Total Payment</p>
              <p className="text-[20px] font-medium text-[#FAFAFA] font-mono">
                {formatLamportsToSol(totalLamports)} SOL
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#52525B] uppercase tracking-[0.06em] mb-1.5">Fee Savings</p>
              <p className="text-[13px] font-medium text-[#5ED9B3]">
                ~{((rows.length - 1) * 0.000005).toFixed(6)} SOL
              </p>
            </div>
          </div>
          
          {isEnabled && proof?.result.proofHash && (
            <div className="mb-4 p-3 rounded-md bg-[rgba(94,217,179,0.05)] border border-[rgba(94,217,179,0.1)]">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#5ED9B3] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-[#5ED9B3] mb-0.5">Compliance Verified</p>
                  <p className="text-[10px] text-[#71717A] font-mono truncate">{proof.result.proofHash}</p>
                </div>
              </div>
            </div>
          )}
          
          <Button 
            size="lg" 
            fullWidth 
            onClick={handleSubmit} 
            isLoading={isProcessing} 
            disabled={!canExecute || rows.length === 0}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing {rows.length} payments...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Execute Batch Payment ({rows.length} recipients)
              </span>
            )}
          </Button>
        </Card>
      </div>

      {/* Results */}
      {result && (
        <div className="mt-6">
          <Card padding="none">
            <div className="p-4 border-b border-[rgba(255,255,255,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-medium text-[#FAFAFA] mb-1">Payment Results</h3>
                  <p className="text-[11px] text-[#71717A]">
                    {result.recipients.filter(r => r.status === 'paid').length} of {result.recipients.length} successful
                  </p>
                </div>
                <div className={`
                  px-3 py-1.5 rounded-md text-[11px] font-medium uppercase tracking-wide
                  ${result.status === 'completed' 
                    ? 'bg-[rgba(94,217,179,0.08)] border border-[rgba(94,217,179,0.15)] text-[#5ED9B3]' 
                    : result.status === 'partial'
                    ? 'bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.15)] text-[#F5A623]'
                    : 'bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] text-[#EF4444]'
                  }
                `}>
                  {result.status}
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-[rgba(255,255,255,0.04)]">
              {result.recipients.map((recipient, index) => (
                <div key={recipient.id} className="p-4 hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium text-[#52525B] uppercase tracking-wider">
                          #{index + 1}
                        </span>
                        <p className="text-[12px] text-[#FAFAFA] font-mono truncate">
                          {recipient.wallet}
                        </p>
                      </div>
                      {recipient.note && (
                        <p className="text-[11px] text-[#71717A]">{recipient.note}</p>
                      )}
                      {recipient.txSignature && (
                        <a
                          href={`https://explorer.solana.com/tx/${recipient.txSignature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-[#5BB98C] hover:text-[#5ED9B3] inline-flex items-center gap-1 mt-1"
                        >
                          View transaction
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                      {recipient.error && (
                        <p className="text-[10px] text-[#EF4444] mt-1">{recipient.error}</p>
                      )}
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <p className="text-[13px] font-medium text-[#FAFAFA] font-mono mb-1">
                        {formatLamportsToSol(recipient.amount)} SOL
                      </p>
                      <div className={`
                        inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide
                        ${recipient.status === 'paid' 
                          ? 'bg-[rgba(94,217,179,0.08)] text-[#5ED9B3]' 
                          : 'bg-[rgba(239,68,68,0.08)] text-[#EF4444]'
                        }
                      `}>
                        {recipient.status === 'paid' ? (
                          <>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Paid
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Failed
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
