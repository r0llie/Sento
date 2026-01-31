// ============================================
// Sento - Balance Dashboard
// Premium data hierarchy, clear focus
// ============================================

'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useWallet, type Wallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, type PublicKey } from '@solana/web3.js';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { WalletButton } from '@/components/wallet/WalletButton';
import { ComplianceToggle } from '@/components/compliance/ComplianceToggle';
import { ComplianceBadge } from '@/components/compliance/ComplianceBadge';
import { ComplianceFirstTimeModal } from '@/components/compliance/ComplianceFirstTimeModal';
import { formatLamportsToSol, formatAddress, formatRelativeTime } from '@/lib/utils/format';
import { usePayment, usePrivateBalance, useInvoices, useActiveTeam, useTeams } from '@/lib/hooks';
import { checkLightProtocolHealth } from '@/lib/solana/light-protocol';
import type { Invoice, Team } from '@/types';
import { 
  generateSelfDisclosureReport, 
  getStoredReports,
  downloadReportAsCSV,
  openPrintableReport,
  type SelfDisclosureReport,
  type ReportType,
} from '@/lib/compliance/range-intel';
import { getRangeAPIStatus } from '@/lib/compliance/range-api';

export default function BalancePage() {
  const { connected, publicKey } = useWallet();
  const { compressSOL, decompressSOL, isCompressing } = usePayment();
  const { 
    privateBalance, 
    walletBalance, 
    isLightProtocolAvailable, 
    refresh: refreshBalances 
  } = usePrivateBalance();
  const { activeTeamId } = useActiveTeam();
  const { getTeamById } = useTeams();
  const activeTeam = getTeamById(activeTeamId);
  const isTeamMode = !!activeTeamId;
  const { invoices, isLoading } = useInvoices(activeTeamId);
  
  const [compressAmount, setCompressAmount] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedBatchIds, setExpandedBatchIds] = useState<Set<string>>(new Set());
  const [lightHealth, setLightHealth] = useState<{rpc: boolean; indexer: boolean; prover: boolean} | null>(null);
  const [activeTab, setActiveTab] = useState<'balance' | 'history' | 'reports'>('balance');

  useEffect(() => {
    checkLightProtocolHealth().then(setLightHealth);
  }, []);

  // Group invoices: batch payments vs regular invoices
  type BatchGroup = {
    type: 'batch';
    id: string;
    invoices: Invoice[];
    totalAmount: number;
    recipientCount: number;
    createdAt: Date;
    isOutgoing: boolean;
  };

  type SingleInvoice = {
    type: 'single';
    invoice: Invoice;
    isIncoming: boolean;
  };

  type ActivityItem = BatchGroup | SingleInvoice;

  const activityItems = useMemo<ActivityItem[]>(() => {
    if (!publicKey) return [];

    const batchInvoices: Invoice[] = [];
    const regularInvoices: Invoice[] = [];

    // Separate batch and regular invoices
    invoices.forEach((invoice) => {
      if (invoice.note?.startsWith('Batch payment')) {
        batchInvoices.push(invoice);
      } else {
        regularInvoices.push(invoice);
      }
    });

    // Group batch invoices by timestamp (± 5 minutes)
    const batchGroups: BatchGroup[] = [];
    const processed = new Set<string>();

    batchInvoices.forEach((invoice) => {
      if (processed.has(invoice.id)) return;

      const invoiceTime = new Date(invoice.createdAt).getTime();
      const group: Invoice[] = [invoice];
      processed.add(invoice.id);

      // Find other batch invoices within 5 minutes
      batchInvoices.forEach((other) => {
        if (processed.has(other.id)) return;
        const otherTime = new Date(other.createdAt).getTime();
        if (Math.abs(invoiceTime - otherTime) <= 5 * 60 * 1000) {
          group.push(other);
          processed.add(other.id);
        }
      });

      const totalAmount = group.reduce((sum, inv) => sum + inv.amount, 0);
      const isOutgoing = group[0].sender === publicKey.toBase58();
      
      batchGroups.push({
        type: 'batch',
        id: `batch-${group[0].id}`,
        invoices: group,
        totalAmount,
        recipientCount: group.length,
        createdAt: group[0].createdAt,
        isOutgoing,
      });
    });

    // Convert regular invoices
    const regularItems: SingleInvoice[] = regularInvoices.map((invoice) => ({
      type: 'single',
      invoice,
      isIncoming: invoice.recipient === publicKey.toBase58(),
    }));

    // Combine and sort by date
    const combined: ActivityItem[] = [...batchGroups, ...regularItems];
    combined.sort((a, b) => {
      const dateA = a.type === 'batch' ? a.createdAt : a.invoice.createdAt;
      const dateB = b.type === 'batch' ? b.createdAt : b.invoice.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return combined.slice(0, 10); // Show top 10 items
  }, [invoices, publicKey]);

  const toggleBatchExpand = (batchId: string) => {
    setExpandedBatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  };

  const handleCompress = async () => {
    if (isTeamMode) return;
    const amount = parseFloat(compressAmount);
    if (isNaN(amount) || amount <= 0) {
      setActionMessage({ type: 'error', text: 'Enter a valid amount' });
      return;
    }

    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
    if (lamports > walletBalance) {
      setActionMessage({ type: 'error', text: 'Insufficient balance' });
      return;
    }

    setActionMessage(null);
    const result = await compressSOL(amount);
    
    if (result.success) {
      setActionMessage({ type: 'success', text: `${amount} SOL moved to private balance` });
      setCompressAmount('');
      refreshBalances();
    } else {
      setActionMessage({ type: 'error', text: result.error || 'Operation failed' });
    }
  };

  const handleClaim = async () => {
    if (isTeamMode) return;
    const amount = parseFloat(claimAmount);
    if (isNaN(amount) || amount <= 0) {
      setActionMessage({ type: 'error', text: 'Enter a valid amount' });
      return;
    }

    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
    if (lamports > privateBalance) {
      setActionMessage({ type: 'error', text: 'Insufficient private balance' });
      return;
    }

    setActionMessage(null);
    const result = await decompressSOL(amount);
    
    if (result.success) {
      setActionMessage({ type: 'success', text: `${amount} SOL withdrawn to wallet` });
      setClaimAmount('');
      refreshBalances();
    } else {
      setActionMessage({ type: 'error', text: result.error || 'Operation failed' });
    }
  };

  const calculateInvoiceBalance = () => {
    if (!publicKey) return { received: 0, sent: 0, pending: 0 };

    const walletAddress = publicKey.toBase58();
    let received = 0;
    let sent = 0;
    let pending = 0;

    invoices.forEach((inv) => {
      if (inv.status === 'paid') {
        if (inv.recipient === walletAddress) received += inv.amount;
        if (inv.sender === walletAddress) sent += inv.amount;
      } else if (inv.status === 'unpaid' && inv.recipient === walletAddress) {
        pending += inv.amount;
      }
    });

    return { received, sent, pending };
  };

  const invoiceBalance = calculateInvoiceBalance();

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pt-16 bg-[#09090B]">
        <Card className="max-w-[360px] w-full text-center" padding="md">
          <CardContent>
            <div className="w-12 h-12 mx-auto mb-5 rounded-lg bg-[rgba(94,217,179,0.08)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[#5ED9B3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <h2 className="text-[18px] font-medium text-[#FAFAFA] tracking-[-0.01em] mb-1">View Balance</h2>
            <p className="text-[13px] text-[#52525B] mb-6 leading-[1.5]">Connect your wallet to manage balances</p>
            <WalletButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-6 bg-[#09090B]">
      {/* First-time compliance modal */}
      <ComplianceFirstTimeModal />
      
      <div className="max-w-[1000px] mx-auto">
        {/* Page Header - LEVEL C */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-[24px] font-medium text-[#FAFAFA] tracking-[-0.02em] mb-1">
                {isTeamMode ? 'Team Dashboard' : 'Dashboard'}
              </h1>
              <p className="text-[13px] text-[#52525B]">
                {isTeamMode ? 'Manage team balances and transactions' : 'Manage your balances and transactions'}
              </p>
            </div>
            {activeTeam && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[rgba(91,185,140,0.08)] border border-[rgba(91,185,140,0.15)] text-[12px] font-medium text-[#5BB98C]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {activeTeam.name}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-[rgba(255,255,255,0.04)]">
            <button
              onClick={() => setActiveTab('balance')}
              className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 ${
                activeTab === 'balance'
                  ? 'border-[#5BB98C] text-[#FAFAFA]'
                  : 'border-transparent text-[#52525B] hover:text-[#71717A]'
              }`}
            >
              Balance
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 ${
                activeTab === 'history'
                  ? 'border-[#5BB98C] text-[#FAFAFA]'
                  : 'border-transparent text-[#52525B] hover:text-[#71717A]'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 ${
                activeTab === 'reports'
                  ? 'border-[#5BB98C] text-[#FAFAFA]'
                  : 'border-transparent text-[#52525B] hover:text-[#71717A]'
              }`}
            >
              Reports
            </button>
          </div>
        </div>

        {/* Action Message */}
        {actionMessage && (
          <div className={`mb-6 p-3 rounded-md text-[13px] ${
            actionMessage.type === 'success' 
              ? 'bg-[rgba(94,217,179,0.08)] border border-[rgba(94,217,179,0.15)] text-[#5ED9B3]' 
              : 'bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] text-[#EF4444]'
          }`}>
            {actionMessage.text}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'balance' && (
          <>
        {/* Main Balance Cards - HIERARCHY: Private > Public */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          
          {/* PUBLIC BALANCE - UTILITY (flat, muted) */}
          <Card variant="public" padding="md">
            <CardContent className="flex flex-col h-full">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-md bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#52525B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                </div>
                <span className="text-[11px] font-medium text-[#52525B] uppercase tracking-[0.06em]">Public</span>
              </div>
              
              {/* Balance display - fixed height container */}
              <div className="flex-1 flex flex-col justify-center min-h-[72px]">
                <div className="text-[32px] font-medium text-[#71717A] font-mono tracking-[-0.02em]">
                  {formatLamportsToSol(walletBalance)}
                </div>
                <p className="text-[11px] text-[#3F3F46] mt-1">SOL · Visible on-chain</p>
              </div>
              
              {/* Input row - always at bottom */}
              <div className="flex gap-2 mt-4">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={compressAmount}
                  onChange={(e) => setCompressAmount(e.target.value)}
                  className="flex-1 h-10 text-[13px]"
                  disabled={isTeamMode}
                />
                <Button
                  onClick={handleCompress}
                  disabled={isCompressing || isTeamMode}
                  variant="secondary"
                  size="sm"
                  className="h-10"
                >
                  {isCompressing ? '...' : 'Hide'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* PRIVATE BALANCE - PREMIUM (Magic, glow) */}
          <Card variant="private" padding="md">
            <CardContent className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-[rgba(94,217,179,0.12)] flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#5ED9B3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-medium text-[#5ED9B3] uppercase tracking-[0.06em]">Private</span>
                </div>
                {/* Compliance Badge - lives where privacy lives */}
                <div className="flex items-center gap-2">
                  {isTeamMode && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-[#A1A1AA] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]">
                      Team
                    </span>
                  )}
                  <ComplianceBadge />
                </div>
              </div>
              
              {/* Balance display - fixed height container */}
              <div className="flex-1 flex flex-col justify-center min-h-[72px]">
                <div className="text-[32px] font-medium text-[#5ED9B3] font-mono tracking-[-0.02em]">
                  {formatLamportsToSol(privateBalance)}
                </div>
                <p className="text-[11px] text-[#52525B] mt-1">SOL · Hidden on-chain</p>
              </div>
              
              {/* Input row - always at bottom */}
              <div className="flex gap-2 mt-4">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(e.target.value)}
                  className="flex-1 h-10 text-[13px]"
                  disabled={isTeamMode}
                />
                <Button
                  variant="primary"
                  onClick={handleClaim}
                  disabled={isCompressing || privateBalance === 0 || isTeamMode}
                  size="sm"
                  className="h-10"
                >
                  {isCompressing ? '...' : 'Claim'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        {isTeamMode && (
          <div className="mb-8 p-4 rounded-lg bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.15)] text-[12px] text-[#F5A623]">
            Team mode is read-only for funds. Switch to Personal to move balances.
          </div>
        )}

        {/* Invoice Stats - LEVEL C (muted) */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Received', value: invoiceBalance.received, color: '#5ED9B3', icon: 'M19 14l-7 7m0 0l-7-7m7 7V3' },
            { label: 'Sent', value: invoiceBalance.sent, color: '#EF4444', icon: 'M5 10l7-7m0 0l7 7m-7-7v18' },
            { label: 'Pending', value: invoiceBalance.pending, color: '#F5A623', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-lg bg-[#111113] border border-[rgba(255,255,255,0.04)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: `${stat.color}12` }}>
                  <svg className="w-3 h-3" style={{ color: stat.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                  </svg>
                </div>
                <span className="text-[10px] text-[#52525B] uppercase tracking-[0.06em]">{stat.label}</span>
              </div>
              <p className="text-[16px] font-medium text-[#71717A] font-mono">{formatLamportsToSol(stat.value)}</p>
                </div>
          ))}
        </div>

        {/* Recent Activity - LEVEL C */}
        <Card padding="none" className="mb-8">
          <div className="p-4 border-b border-[rgba(255,255,255,0.04)] flex items-center justify-between">
            <div>
              <h2 className="text-[13px] font-medium text-[#71717A]">
                {isTeamMode ? 'Team Invoices' : 'Recent Activity'}
              </h2>
            </div>
            <Link href="/invoice/create">
              <Button size="sm" variant="secondary">+ New</Button>
            </Link>
            </div>

          <div>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-5 h-5 border-2 border-[#5ED9B3] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-14 px-6">
                <div className="w-11 h-11 mx-auto mb-4 rounded-lg bg-[rgba(255,255,255,0.03)] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#3F3F46]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <p className="text-[13px] text-[#52525B] mb-4">No invoices yet</p>
                <Link href="/invoice/create">
                  <Button variant="secondary" size="sm">Create Invoice</Button>
                </Link>
              </div>
            ) : (
              <div>
                {activityItems.map((item, index) => {
                  if (item.type === 'batch') {
                    const isExpanded = expandedBatchIds.has(item.id);
                    return (
                      <div key={item.id} className={`${index !== 0 ? 'border-t border-[rgba(255,255,255,0.03)]' : ''}`}>
                        {/* Batch Summary Card */}
                        <button
                          onClick={() => toggleBatchExpand(item.id)}
                          className="w-full flex items-center justify-between p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${item.isOutgoing ? 'bg-[rgba(239,68,68,0.1)]' : 'bg-[rgba(94,217,179,0.1)]'}`}>
                              <svg className={`w-3.5 h-3.5 ${item.isOutgoing ? 'text-[#EF4444]' : 'text-[#5ED9B3]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                              </svg>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-[13px] font-medium text-[#FAFAFA]">Batch Payment</p>
                                <span className="px-1.5 py-0.5 bg-[rgba(255,255,255,0.04)] rounded text-[10px] text-[#71717A]">
                                  {item.recipientCount} {item.recipientCount === 1 ? 'recipient' : 'recipients'}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#52525B]">
                                {formatRelativeTime(item.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className={`text-[13px] font-medium font-mono ${item.isOutgoing ? 'text-[#EF4444]' : 'text-[#5ED9B3]'}`}>
                                {item.isOutgoing ? '-' : '+'}{formatLamportsToSol(item.totalAmount)}
                              </p>
                              <span className="text-[10px] font-medium text-[#5ED9B3]">paid</span>
                            </div>
                            <svg
                              className={`w-4 h-4 text-[#52525B] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {/* Expanded Batch Recipients */}
                        {isExpanded && (
                          <div className="bg-[rgba(255,255,255,0.01)] border-t border-[rgba(255,255,255,0.03)]">
                            {item.invoices.map((invoice, invIndex) => (
                              <Link key={invoice.id} href={`/invoice/${invoice.id}`} className="block">
                                <div className={`flex items-center justify-between p-4 pl-14 hover:bg-[rgba(255,255,255,0.02)] transition-colors ${invIndex !== 0 ? 'border-t border-[rgba(255,255,255,0.02)]' : ''}`}>
                                  <div>
                                    <p className="text-[12px] text-[#FAFAFA]">
                                      {item.isOutgoing ? 'To' : 'From'} {formatAddress(item.isOutgoing ? invoice.recipient : invoice.sender)}
                                    </p>
                                    {invoice.note && invoice.note !== 'Batch payment' && (
                                      <p className="text-[10px] text-[#52525B] mt-0.5">
                                        {invoice.note.replace('Batch payment: ', '')}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <p className={`text-[12px] font-medium font-mono ${item.isOutgoing ? 'text-[#EF4444]' : 'text-[#5ED9B3]'}`}>
                                      {item.isOutgoing ? '-' : '+'}{formatLamportsToSol(invoice.amount)}
                                    </p>
                                    {invoice.txSignature && (
                                      <a
                                        href={`https://explorer.solana.com/tx/${invoice.txSignature}?cluster=devnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-[10px] text-[#71717A] hover:text-[#5ED9B3] transition-colors"
                                      >
                                        View tx ↗
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    // Single invoice
                    const { invoice, isIncoming } = item;
                    return (
                      <Link key={invoice.id} href={`/invoice/${invoice.id}`} className="block">
                        <div className={`flex items-center justify-between p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors ${index !== 0 ? 'border-t border-[rgba(255,255,255,0.03)]' : ''}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${isIncoming ? 'bg-[rgba(94,217,179,0.1)]' : 'bg-[rgba(239,68,68,0.1)]'}`}>
                              <svg className={`w-3.5 h-3.5 ${isIncoming ? 'text-[#5ED9B3]' : 'text-[#EF4444]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d={isIncoming ? 'M19 14l-7 7m0 0l-7-7m7 7V3' : 'M5 10l7-7m0 0l7 7m-7-7v18'} />
                              </svg>
                            </div>
                            <div>
                              <p className="text-[13px] font-medium text-[#FAFAFA]">{invoice.note || 'Payment'}</p>
                              <p className="text-[11px] text-[#52525B]">
                                {isIncoming ? 'From' : 'To'} {formatAddress(isIncoming ? invoice.sender : invoice.recipient)} · {formatRelativeTime(invoice.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-[13px] font-medium font-mono ${isIncoming ? 'text-[#5ED9B3]' : 'text-[#EF4444]'}`}>
                              {isIncoming ? '+' : '-'}{formatLamportsToSol(invoice.amount)}
                            </p>
                            <span className={`text-[10px] font-medium ${invoice.status === 'paid' ? 'text-[#5ED9B3]' : 'text-[#F5A623]'}`}>
                              {invoice.status}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  }
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Protocol Status - LEVEL C (subtle) */}
        {lightHealth && (
          <div className="p-4 rounded-lg bg-[#111113] border border-[rgba(255,255,255,0.04)] mb-6">
            <h3 className="text-[10px] font-medium text-[#52525B] uppercase tracking-[0.06em] mb-3">Protocol</h3>
            <div className="flex items-center gap-6">
              {[
                { name: 'RPC', status: lightHealth.rpc },
                { name: 'Indexer', status: lightHealth.indexer },
                { name: 'Prover', status: lightHealth.prover },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${item.status ? 'bg-[#5ED9B3]' : 'bg-[#EF4444]'}`} />
                  <span className="text-[11px] text-[#52525B]">{item.name}</span>
              </div>
              ))}
            </div>
            {!isLightProtocolAvailable && (
              <p className="text-[11px] text-[#F5A623] mt-2">
                Protocol unavailable. Private transfers disabled.
              </p>
            )}
          </div>
        )}

        {/* Settings - LEVEL C (Details only, primary surface is badge) */}
        <div id="compliance-settings" className="mb-6 scroll-mt-24">
          <h2 className="text-[10px] font-medium text-[#52525B] uppercase tracking-[0.06em] mb-3">Settings</h2>
          <ComplianceToggle />
        </div>

        {/* Privacy Notice - LEVEL C (muted info) */}
        <div className="p-4 rounded-lg bg-[rgba(94,217,179,0.03)] border border-[rgba(94,217,179,0.08)]">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-md bg-[rgba(94,217,179,0.1)] flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-[#5ED9B3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <h3 className="text-[12px] font-medium text-[#71717A] mb-1.5">How Privacy Works</h3>
              <ul className="text-[11px] text-[#52525B] space-y-1 leading-[1.4]">
                <li><span className="text-[#71717A]">Public:</span> Visible on explorers</li>
                <li><span className="text-[#71717A]">Private:</span> Hidden with ZK compression</li>
                <li><span className="text-[#71717A]">Hide:</span> Compress to private</li>
                <li><span className="text-[#71717A]">Claim:</span> Withdraw to wallet</li>
              </ul>
            </div>
          </div>
        </div>
        </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="mt-6">
            <Card padding="none">
              <div className="p-4 border-b border-[rgba(255,255,255,0.04)] flex items-center justify-between">
                <div>
                  <h2 className="text-[13px] font-medium text-[#71717A]">
                    {isTeamMode ? 'Team Transaction History' : 'Transaction History'}
                  </h2>
                  <p className="text-[11px] text-[#52525B] mt-0.5">
                    All invoices sorted by date
                  </p>
                </div>
                <span className="text-[11px] text-[#52525B]">{activityItems.length} items</span>
              </div>

              <div>
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-5 h-5 border-2 border-[#5ED9B3] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : activityItems.length === 0 ? (
                  <div className="text-center py-14 px-6">
                    <div className="w-11 h-11 mx-auto mb-4 rounded-lg bg-[rgba(255,255,255,0.03)] flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#3F3F46]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-[13px] text-[#52525B] mb-4">No transaction history yet</p>
                    <Link href="/invoice/create">
                      <Button variant="secondary" size="sm">Create First Invoice</Button>
                    </Link>
                  </div>
                ) : (
                  <div>
                    {activityItems.map((item, index) => {
                      if (item.type === 'batch') {
                        const isExpanded = expandedBatchIds.has(item.id);
                        return (
                          <div key={item.id} className={`${index !== 0 ? 'border-t border-[rgba(255,255,255,0.03)]' : ''}`}>
                            {/* Batch Summary */}
                            <button
                              onClick={() => toggleBatchExpand(item.id)}
                              className="w-full flex items-center justify-between p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-md flex items-center justify-center ${item.isOutgoing ? 'bg-[rgba(239,68,68,0.1)]' : 'bg-[rgba(94,217,179,0.1)]'}`}>
                                  <svg className={`w-3.5 h-3.5 ${item.isOutgoing ? 'text-[#EF4444]' : 'text-[#5ED9B3]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                                  </svg>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[13px] font-medium text-[#FAFAFA]">Batch Payment</p>
                                    <span className="px-1.5 py-0.5 bg-[rgba(255,255,255,0.04)] rounded text-[10px] text-[#71717A]">
                                      {item.recipientCount} {item.recipientCount === 1 ? 'recipient' : 'recipients'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-[#52525B]">
                                    {new Date(item.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className={`text-[13px] font-medium font-mono ${item.isOutgoing ? 'text-[#EF4444]' : 'text-[#5ED9B3]'}`}>
                                    {item.isOutgoing ? '-' : '+'}{formatLamportsToSol(item.totalAmount)}
                                  </p>
                                  <span className="text-[10px] font-medium text-[#5ED9B3]">paid</span>
                                </div>
                                <svg
                                  className={`w-4 h-4 text-[#52525B] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </button>

                            {/* Expanded Recipients */}
                            {isExpanded && (
                              <div className="bg-[rgba(255,255,255,0.01)] border-t border-[rgba(255,255,255,0.03)]">
                                {item.invoices.map((invoice, invIndex) => (
                                  <Link key={invoice.id} href={`/invoice/${invoice.id}`} className="block">
                                    <div className={`flex items-center justify-between p-4 pl-14 hover:bg-[rgba(255,255,255,0.02)] transition-colors ${invIndex !== 0 ? 'border-t border-[rgba(255,255,255,0.02)]' : ''}`}>
                                      <div>
                                        <p className="text-[12px] text-[#FAFAFA]">
                                          {item.isOutgoing ? 'To' : 'From'} {formatAddress(item.isOutgoing ? invoice.recipient : invoice.sender)}
                                        </p>
                                        <p className="text-[10px] text-[#52525B] mt-0.5">
                                          {new Date(invoice.createdAt).toLocaleString()}
                                        </p>
                                      </div>
                                      <p className={`text-[12px] font-medium font-mono ${item.isOutgoing ? 'text-[#EF4444]' : 'text-[#5ED9B3]'}`}>
                                        {item.isOutgoing ? '-' : '+'}{formatLamportsToSol(invoice.amount)}
                                      </p>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      } else {
                        // Single invoice
                        const { invoice, isIncoming } = item;
                        return (
                          <Link key={invoice.id} href={`/invoice/${invoice.id}`} className="block">
                            <div className={`flex items-center justify-between p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors ${index !== 0 ? 'border-t border-[rgba(255,255,255,0.03)]' : ''}`}>
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-md flex items-center justify-center ${isIncoming ? 'bg-[rgba(94,217,179,0.1)]' : 'bg-[rgba(239,68,68,0.1)]'}`}>
                                  <svg className={`w-3.5 h-3.5 ${isIncoming ? 'text-[#5ED9B3]' : 'text-[#EF4444]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d={isIncoming ? 'M19 14l-7 7m0 0l-7-7m7 7V3' : 'M5 10l7-7m0 0l7 7m-7-7v18'} />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-[13px] font-medium text-[#FAFAFA]">{invoice.note || 'Payment'}</p>
                                  <p className="text-[11px] text-[#52525B]">
                                    {isIncoming ? 'From' : 'To'} {formatAddress(isIncoming ? invoice.sender : invoice.recipient)} • {new Date(invoice.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-[13px] font-medium font-mono ${isIncoming ? 'text-[#5ED9B3]' : 'text-[#EF4444]'}`}>
                                  {isIncoming ? '+' : '-'}{formatLamportsToSol(invoice.amount)}
                                </p>
                                <span className={`text-[10px] font-medium ${invoice.status === 'paid' ? 'text-[#5ED9B3]' : 'text-[#F5A623]'}`}>
                                  {invoice.status}
                                </span>
                              </div>
                            </div>
                          </Link>
                        );
                      }
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <ReportsTabContent 
            publicKey={publicKey} 
            invoices={invoices}
            activeTeam={activeTeam}
            isTeamMode={isTeamMode}
          />
        )}
      </div>
    </div>
  );
}

// ============================================
// Reports Tab Component
// ============================================

// Report type configurations
const reportTypes: { type: ReportType; label: string; description: string; icon: string }[] = [
  {
    type: 'tax',
    label: 'Tax Report',
    description: 'Income and payments summary',
    icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
  },
  {
    type: 'payroll',
    label: 'Payroll Report',
    description: 'Payments from employers',
    icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    type: 'compliance',
    label: 'Compliance',
    description: 'Full transaction history',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
];

// Period presets
const periodPresets = [
  { label: 'This Month', getValue: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
  { label: 'Last Month', getValue: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'This Quarter', getValue: () => ({ start: startOfQuarter(new Date()), end: new Date() }) },
  { label: 'This Year', getValue: () => ({ start: new Date(new Date().getFullYear(), 0, 1), end: new Date() }) },
];

// Date helpers
function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
}

function subMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() - months, date.getDate());
}

function startOfQuarter(date: Date): Date {
  const quarter = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), quarter * 3, 1);
}

interface ReportsTabProps {
  publicKey: PublicKey | null;
  invoices: Invoice[];
  activeTeam: Team | undefined;
  isTeamMode: boolean;
}

function ReportsTabContent({ publicKey, invoices, activeTeam, isTeamMode }: ReportsTabProps) {
  const [reports, setReports] = useState<SelfDisclosureReport[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<ReportType>('tax');
  const [selectedPeriod, setSelectedPeriod] = useState(0);
  const [generatedReport, setGeneratedReport] = useState<SelfDisclosureReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) return;
    const storedReports = getStoredReports(publicKey.toBase58());
    setReports(storedReports);
  }, [publicKey]);

  const handleGenerateReport = async () => {
    if (!publicKey) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedReport(null);

    try {
      const period = periodPresets[selectedPeriod].getValue();
      
      const report = await generateSelfDisclosureReport({
        walletAddress: publicKey.toBase58(),
        reportType: selectedType,
        period,
        invoices,
        includeNotes: true,
      });

      setGeneratedReport(report);
      
      const updatedReports = getStoredReports(publicKey.toBase58());
      setReports(updatedReports);
    } catch (err) {
      console.error('Failed to generate report:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = () => {
    if (generatedReport) {
      downloadReportAsCSV(generatedReport);
    }
  };

  const handlePrint = () => {
    if (generatedReport) {
      openPrintableReport(generatedReport);
    }
  };

  const apiStatus = getRangeAPIStatus();

  return (
    <div className="mt-6 space-y-6">
      {/* Info Banner */}
      <div className="p-4 rounded-lg bg-[rgba(94,217,179,0.04)] border border-[rgba(94,217,179,0.1)]">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-md bg-[rgba(94,217,179,0.1)] flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-[#5ED9B3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-[13px] font-medium text-[#5ED9B3] mb-1">Privacy by Default, Disclosure When Needed</h3>
            <p className="text-[11px] text-[#52525B] leading-[1.5]">
              Generate verifiable reports for tax authorities, employers, or auditors when you choose to disclose.
            </p>
          </div>
        </div>
      </div>

      {/* API Status */}
      <div className="flex items-center gap-2 text-[11px]">
        <span className={`w-1.5 h-1.5 rounded-full ${apiStatus.configured ? 'bg-[#5ED9B3]' : 'bg-[#F5A623]'}`} />
        <span className="text-[#52525B]">
          {apiStatus.configured ? 'Range API Connected' : 'Using Simulation Mode'}
        </span>
      </div>

      {/* Report Generator */}
      <Card padding="none">
        <div className="p-5 border-b border-[rgba(255,255,255,0.04)]">
          <h2 className="text-[14px] font-medium text-[#FAFAFA] mb-1">Generate Report</h2>
          <p className="text-[11px] text-[#52525B]">Select report type and time period</p>
        </div>
        
        <div className="p-5">
          {/* Report Type */}
          <div className="mb-5">
            <label className="block text-[10px] font-medium text-[#52525B] uppercase tracking-[0.05em] mb-2.5">
              Report Type
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {reportTypes.map((rt) => (
                <button
                  key={rt.type}
                  onClick={() => setSelectedType(rt.type)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedType === rt.type
                      ? 'bg-[rgba(94,217,179,0.08)] border-[rgba(94,217,179,0.3)]'
                      : 'bg-[#111113] border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.1)]'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center mb-2 ${
                    selectedType === rt.type ? 'bg-[rgba(94,217,179,0.15)]' : 'bg-[rgba(255,255,255,0.04)]'
                  }`}>
                    <svg 
                      className={`w-3.5 h-3.5 ${selectedType === rt.type ? 'text-[#5ED9B3]' : 'text-[#52525B]'}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor" 
                      strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={rt.icon} />
                    </svg>
                  </div>
                  <h3 className={`text-[12px] font-medium mb-0.5 ${
                    selectedType === rt.type ? 'text-[#5ED9B3]' : 'text-[#FAFAFA]'
                  }`}>
                    {rt.label}
                  </h3>
                  <p className="text-[10px] text-[#52525B]">{rt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Period */}
          <div className="mb-5">
            <label className="block text-[10px] font-medium text-[#52525B] uppercase tracking-[0.05em] mb-2.5">
              Time Period
            </label>
            <div className="flex flex-wrap gap-2">
              {periodPresets.map((preset, index) => (
                <button
                  key={preset.label}
                  onClick={() => setSelectedPeriod(index)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                    selectedPeriod === index
                      ? 'bg-[#5ED9B3] text-[#09090B]'
                      : 'bg-[#111113] text-[#71717A] hover:text-[#FAFAFA] border border-[rgba(255,255,255,0.05)]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Invoice Stats */}
          <div className="mb-5 p-3 rounded-lg bg-[#0D0E10] border border-[rgba(255,255,255,0.04)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#52525B]">Available Invoices</span>
              <span className="text-[12px] font-medium text-[#71717A]">
                {invoices.filter((inv) => inv.status === 'paid').length} paid
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 p-2.5 rounded-md bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)]">
              <p className="text-[11px] text-[#EF4444]">{error}</p>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            fullWidth
            size="md"
          >
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </Card>

      {/* Generated Report */}
      {generatedReport && (
        <Card padding="none">
          <div className="p-4 border-b border-[rgba(255,255,255,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-medium text-[#FAFAFA] mb-0.5">
                  {reportTypes.find((rt) => rt.type === generatedReport.reportType)?.label}
                </h2>
                <p className="text-[10px] text-[#52525B]">
                  {generatedReport.period.start.toLocaleDateString()} - {generatedReport.period.end.toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleExportCSV}>
                  CSV
                </Button>
                <Button variant="secondary" size="sm" onClick={handlePrint}>
                  Print
                </Button>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 grid grid-cols-4 gap-3 border-b border-[rgba(255,255,255,0.04)]">
            <div>
              <p className="text-[9px] text-[#52525B] uppercase tracking-[0.05em] mb-0.5">Received</p>
              <p className="text-[15px] font-medium text-[#5ED9B3] font-mono">
                {formatLamportsToSol(generatedReport.summary.totalReceived)}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-[#52525B] uppercase tracking-[0.05em] mb-0.5">Paid</p>
              <p className="text-[15px] font-medium text-[#EF4444] font-mono">
                {formatLamportsToSol(generatedReport.summary.totalPaid)}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-[#52525B] uppercase tracking-[0.05em] mb-0.5">Net</p>
              <p className="text-[15px] font-medium text-[#FAFAFA] font-mono">
                {formatLamportsToSol(generatedReport.summary.totalReceived - generatedReport.summary.totalPaid)}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-[#52525B] uppercase tracking-[0.05em] mb-0.5">Count</p>
              <p className="text-[15px] font-medium text-[#71717A] font-mono">
                {generatedReport.summary.transactionCount}
              </p>
            </div>
          </div>

          {/* Transactions */}
          {generatedReport.transactions.length > 0 ? (
            <div className="max-h-[300px] overflow-y-auto divide-y divide-[rgba(255,255,255,0.03)]">
              {generatedReport.transactions.map((tx, index) => (
                <div key={index} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
                      tx.type === 'received' ? 'bg-[rgba(94,217,179,0.1)]' : 'bg-[rgba(239,68,68,0.1)]'
                    }`}>
                      <svg 
                        className={`w-3 h-3 ${tx.type === 'received' ? 'text-[#5ED9B3]' : 'text-[#EF4444]'}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor" 
                        strokeWidth={2}
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          d={tx.type === 'received' ? 'M19 14l-7 7m0 0l-7-7m7 7V3' : 'M5 10l7-7m0 0l7 7m-7-7v18'} 
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[12px] text-[#FAFAFA]">{tx.note || 'Payment'}</p>
                      <p className="text-[10px] text-[#52525B]">
                        {tx.type === 'received' ? 'From' : 'To'} {formatAddress(tx.counterparty)} • {tx.date.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p className={`text-[12px] font-medium font-mono ${
                    tx.type === 'received' ? 'text-[#5ED9B3]' : 'text-[#EF4444]'
                  }`}>
                    {tx.type === 'received' ? '+' : '-'}{formatLamportsToSol(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-[12px] text-[#52525B]">No transactions in this period</p>
            </div>
          )}

          {/* Proof */}
          <div className="p-3 bg-[#0D0E10] border-t border-[rgba(255,255,255,0.04)]">
            <p className="text-[9px] text-[#52525B] uppercase tracking-[0.05em] mb-1">Proof</p>
            <p className="text-[10px] text-[#71717A] font-mono break-all">{generatedReport.proofHash}</p>
          </div>
        </Card>
      )}

      {/* Previous Reports */}
      {reports.length > 0 && (
        <Card padding="none">
          <div className="p-3 border-b border-[rgba(255,255,255,0.04)]">
            <h2 className="text-[12px] font-medium text-[#71717A]">Previous Reports</h2>
          </div>
          <div className="divide-y divide-[rgba(255,255,255,0.03)]">
            {reports.slice(0, 3).map((report) => (
              <button
                key={report.id} 
                className="w-full p-3 flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)] text-left"
                onClick={() => setGeneratedReport(report)}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-[#52525B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        d={reportTypes.find((rt) => rt.type === report.reportType)?.icon || ''} 
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#FAFAFA]">
                      {reportTypes.find((rt) => rt.type === report.reportType)?.label}
                    </p>
                    <p className="text-[10px] text-[#52525B]">
                      {report.period.start.toLocaleDateString()} - {report.period.end.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-[#71717A]">{formatRelativeTime(report.generatedAt)}</p>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
