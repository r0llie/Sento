// ============================================
// Sento - Self-Disclosure Reports Page
// Generate tax/payroll/compliance reports from private transactions
// ============================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { WalletButton } from '@/components/wallet/WalletButton';
import { formatLamportsToSol, formatAddress, formatRelativeTime } from '@/lib/utils/format';
import { useActiveTeam, useInvoices, useTeams } from '@/lib/hooks';
import { 
  generateSelfDisclosureReport, 
  getStoredReports,
  downloadReportAsCSV,
  openPrintableReport,
  type SelfDisclosureReport,
  type ReportType,
} from '@/lib/compliance/range-intel';
import { getRangeAPIStatus } from '@/lib/compliance/range-api';
import type { Invoice } from '@/types';

// Report type configurations
const reportTypes: { type: ReportType; label: string; description: string; icon: string }[] = [
  {
    type: 'tax',
    label: 'Tax Report',
    description: 'Income and payments summary for tax filing',
    icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
  },
  {
    type: 'payroll',
    label: 'Payroll Report',
    description: 'Payments received from employers/clients',
    icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    type: 'compliance',
    label: 'Compliance Report',
    description: 'Full transaction history for auditors',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
];

// Period presets
const periodPresets = [
  { label: 'This Month', getValue: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
  { label: 'Last Month', getValue: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'This Quarter', getValue: () => ({ start: startOfQuarter(new Date()), end: new Date() }) },
  { label: 'This Year', getValue: () => ({ start: new Date(new Date().getFullYear(), 0, 1), end: new Date() }) },
  { label: 'Last Year', getValue: () => ({ start: new Date(new Date().getFullYear() - 1, 0, 1), end: new Date(new Date().getFullYear() - 1, 11, 31) }) },
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

export default function ReportsPage() {
  const { connected, publicKey } = useWallet();
  const [reports, setReports] = useState<SelfDisclosureReport[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<ReportType>('tax');
  const [selectedPeriod, setSelectedPeriod] = useState(0); // Index of preset
  const [generatedReport, setGeneratedReport] = useState<SelfDisclosureReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { activeTeamId } = useActiveTeam();
  const { getTeamById } = useTeams();
  const activeTeam = getTeamById(activeTeamId);
  const { invoices } = useInvoices(activeTeamId);

  // Load invoices and existing reports
  useEffect(() => {
    if (!publicKey) return;

    // Load existing reports
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
      
      // Refresh stored reports
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

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pt-16 bg-[#09090B]">
        <Card className="max-w-[360px] w-full text-center" padding="md">
          <CardContent>
            <div className="w-12 h-12 mx-auto mb-5 rounded-lg bg-[rgba(94,217,179,0.08)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[#5ED9B3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            </div>
            <h2 className="text-[18px] font-medium text-[#FAFAFA] tracking-[-0.01em] mb-1">Self-Disclosure Reports</h2>
            <p className="text-[13px] text-[#52525B] mb-6 leading-[1.5]">Connect your wallet to generate compliance reports</p>
            <WalletButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-6 bg-[#09090B]">
      <div className="max-w-[1000px] mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <div className="mb-4">
            <h1 className="text-[24px] font-medium text-[#FAFAFA] tracking-[-0.02em] mb-1">
              {activeTeam ? 'Team Reports' : 'Self-Disclosure Reports'}
            </h1>
            <p className="text-[13px] text-[#52525B]">
              Generate tax, payroll, or compliance reports from your private transactions
            </p>
            {activeTeam && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[rgba(91,185,140,0.08)] border border-[rgba(91,185,140,0.15)] text-[12px] font-medium text-[#5BB98C]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Team: {activeTeam.name}
              </div>
            )}
          </div>
        </div>

        {/* Value Proposition */}
        <div className="mb-8 p-4 rounded-lg bg-[rgba(94,217,179,0.04)] border border-[rgba(94,217,179,0.1)]">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-md bg-[rgba(94,217,179,0.1)] flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-[#5ED9B3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-[13px] font-medium text-[#5ED9B3] mb-1">Privacy by Default, Disclosure When Needed</h3>
              <p className="text-[12px] text-[#52525B] leading-[1.5]">
                Your transactions are private on-chain, but you can generate verifiable reports for tax authorities, 
                employers, or auditors when you choose to disclose.
              </p>
            </div>
          </div>
        </div>

        {/* API Status */}
        <div className="mb-6 flex items-center gap-2 text-[11px]">
          <span className={`w-1.5 h-1.5 rounded-full ${apiStatus.configured ? 'bg-[#5ED9B3]' : 'bg-[#F5A623]'}`} />
          <span className="text-[#52525B]">
            {apiStatus.configured ? 'Range API Connected' : 'Using Simulation Mode'}
          </span>
        </div>

        {/* Report Generator */}
        <Card padding="none" className="mb-8">
          <div className="p-6 border-b border-[rgba(255,255,255,0.04)]">
            <h2 className="text-[15px] font-medium text-[#FAFAFA] mb-1">Generate Report</h2>
            <p className="text-[12px] text-[#52525B]">Select report type and time period</p>
          </div>
          
          <div className="p-6">
            {/* Report Type Selection */}
            <div className="mb-6">
              <label className="block text-[11px] font-medium text-[#52525B] uppercase tracking-[0.05em] mb-3">
                Report Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {reportTypes.map((rt) => (
                  <button
                    key={rt.type}
                    onClick={() => setSelectedType(rt.type)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      selectedType === rt.type
                        ? 'bg-[rgba(94,217,179,0.08)] border-[rgba(94,217,179,0.3)]'
                        : 'bg-[#111113] border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.1)]'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center mb-3 ${
                      selectedType === rt.type ? 'bg-[rgba(94,217,179,0.15)]' : 'bg-[rgba(255,255,255,0.04)]'
                    }`}>
                      <svg 
                        className={`w-4 h-4 ${selectedType === rt.type ? 'text-[#5ED9B3]' : 'text-[#52525B]'}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor" 
                        strokeWidth={1.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d={rt.icon} />
                      </svg>
                    </div>
                    <h3 className={`text-[13px] font-medium mb-1 ${
                      selectedType === rt.type ? 'text-[#5ED9B3]' : 'text-[#FAFAFA]'
                    }`}>
                      {rt.label}
                    </h3>
                    <p className="text-[11px] text-[#52525B]">{rt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Period Selection */}
            <div className="mb-6">
              <label className="block text-[11px] font-medium text-[#52525B] uppercase tracking-[0.05em] mb-3">
                Time Period
              </label>
              <div className="flex flex-wrap gap-2">
                {periodPresets.map((preset, index) => (
                  <button
                    key={preset.label}
                    onClick={() => setSelectedPeriod(index)}
                    className={`px-4 py-2 rounded-md text-[12px] font-medium transition-all ${
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
            <div className="mb-6 p-4 rounded-lg bg-[#0D0E10] border border-[rgba(255,255,255,0.04)]">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#52525B]">Available Invoices</span>
                <span className="text-[13px] font-medium text-[#71717A]">
                  {invoices.filter((inv) => inv.status === 'paid').length} paid
                </span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-3 rounded-md bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)]">
                <p className="text-[12px] text-[#EF4444]">{error}</p>
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              fullWidth
              size="lg"
            >
              {isGenerating ? 'Generating Report...' : 'Generate Report'}
            </Button>
          </div>
        </Card>

        {/* Generated Report */}
        {generatedReport && (
          <Card padding="none" className="mb-8">
            <div className="p-6 border-b border-[rgba(255,255,255,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-medium text-[#FAFAFA] mb-1">
                    {reportTypes.find((rt) => rt.type === generatedReport.reportType)?.label}
                  </h2>
                  <p className="text-[11px] text-[#52525B]">
                    {generatedReport.period.start.toLocaleDateString()} - {generatedReport.period.end.toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handleExportCSV}>
                    Export CSV
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handlePrint}>
                    Print / PDF
                  </Button>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-[rgba(255,255,255,0.04)]">
              <div>
                <p className="text-[10px] text-[#52525B] uppercase tracking-[0.05em] mb-1">Total Received</p>
                <p className="text-[18px] font-medium text-[#5ED9B3] font-mono">
                  {formatLamportsToSol(generatedReport.summary.totalReceived)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#52525B] uppercase tracking-[0.05em] mb-1">Total Paid</p>
                <p className="text-[18px] font-medium text-[#EF4444] font-mono">
                  {formatLamportsToSol(generatedReport.summary.totalPaid)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#52525B] uppercase tracking-[0.05em] mb-1">Net Amount</p>
                <p className="text-[18px] font-medium text-[#FAFAFA] font-mono">
                  {formatLamportsToSol(generatedReport.summary.totalReceived - generatedReport.summary.totalPaid)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#52525B] uppercase tracking-[0.05em] mb-1">Transactions</p>
                <p className="text-[18px] font-medium text-[#71717A] font-mono">
                  {generatedReport.summary.transactionCount}
                </p>
              </div>
            </div>

            {/* Transactions */}
            {generatedReport.transactions.length > 0 ? (
              <div className="divide-y divide-[rgba(255,255,255,0.03)]">
                {generatedReport.transactions.map((tx, index) => (
                  <div key={index} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                        tx.type === 'received' ? 'bg-[rgba(94,217,179,0.1)]' : 'bg-[rgba(239,68,68,0.1)]'
                      }`}>
                        <svg 
                          className={`w-3.5 h-3.5 ${tx.type === 'received' ? 'text-[#5ED9B3]' : 'text-[#EF4444]'}`} 
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
                        <p className="text-[13px] text-[#FAFAFA]">{tx.note || 'Payment'}</p>
                        <p className="text-[11px] text-[#52525B]">
                          {tx.type === 'received' ? 'From' : 'To'} {formatAddress(tx.counterparty)} • {tx.date.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className={`text-[13px] font-medium font-mono ${
                      tx.type === 'received' ? 'text-[#5ED9B3]' : 'text-[#EF4444]'
                    }`}>
                      {tx.type === 'received' ? '+' : '-'}{formatLamportsToSol(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-[13px] text-[#52525B]">No transactions in this period</p>
              </div>
            )}

            {/* Proof Hash */}
            <div className="p-4 bg-[#0D0E10] border-t border-[rgba(255,255,255,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-[#52525B] uppercase tracking-[0.05em] mb-1">Verification Proof</p>
                  <p className="text-[11px] text-[#71717A] font-mono break-all">{generatedReport.proofHash}</p>
                </div>
                {generatedReport.verificationUrl && (
                  <a 
                    href={generatedReport.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#5ED9B3] hover:text-[#6FE9C3]"
                  >
                    Verify →
                  </a>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Previous Reports */}
        {reports.length > 0 && (
          <Card padding="none">
            <div className="p-4 border-b border-[rgba(255,255,255,0.04)]">
              <h2 className="text-[13px] font-medium text-[#71717A]">Previous Reports</h2>
            </div>
            <div className="divide-y divide-[rgba(255,255,255,0.03)]">
              {reports.slice(0, 5).map((report) => (
                <div 
                  key={report.id} 
                  className="p-4 flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)] cursor-pointer"
                  onClick={() => setGeneratedReport(report)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
                      <svg className="w-4 h-4 text-[#52525B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          d={reportTypes.find((rt) => rt.type === report.reportType)?.icon || ''} 
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[13px] text-[#FAFAFA]">
                        {reportTypes.find((rt) => rt.type === report.reportType)?.label}
                      </p>
                      <p className="text-[11px] text-[#52525B]">
                        {report.period.start.toLocaleDateString()} - {report.period.end.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] text-[#71717A]">{formatRelativeTime(report.generatedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Navigation */}
        <div className="mt-8 text-center">
          <Link href="/balance" className="text-[13px] text-[#52525B] hover:text-[#71717A]">
            ← Back to Balance
          </Link>
        </div>
      </div>
    </div>
  );
}
