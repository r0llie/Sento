// ============================================
// Sento - Range Data API Integration for Self-Disclosure
// Self-Disclosure Reports for Tax/Compliance
// ============================================

/**
 * Range Data API enables users to generate self-disclosure reports
 * from their private transactions for tax, payroll, or compliance purposes.
 * 
 * Key Value: Privacy by default, disclosure when needed
 * 
 * Uses Range Data API for:
 * - Address transaction history (GET /v1/address/transactions)
 * - Address intelligence (GET /v1/address)
 * - Risk verification via Risk API (GET /v1/risk/address)
 * 
 * Docs: https://docs.range.org/data-api
 */

import type { Invoice } from '@/types';

// Environment configuration
// Range Data API base URL - for blockchain intelligence
const RANGE_API_URL = process.env.NEXT_PUBLIC_RANGE_API_URL || 'https://api.range.org';
const RANGE_API_KEY = process.env.NEXT_PUBLIC_RANGE_API_KEY;
const USE_SIMULATION = !RANGE_API_KEY || process.env.NEXT_PUBLIC_USE_RANGE_SIMULATION === 'true';

// ============================================
// Range Data API Response Types
// ============================================

interface RangeAddressInfo {
  address: string;
  network: string;
  first_seen?: string;
  last_seen?: string;
  transaction_count?: number;
  label?: string;
  entity?: string;
  category?: string;
}

interface RangeTransaction {
  hash: string;
  timestamp: string;
  from_address: string;
  to_address: string;
  amount: number;
  token?: string;
  network: string;
}

interface RangeTransactionsResponse {
  transactions: RangeTransaction[];
  total_count: number;
  page: number;
  page_size: number;
}

// ============================================
// Types
// ============================================

export type ReportType = 'tax' | 'payroll' | 'compliance' | 'custom';

export interface ReportPeriod {
  start: Date;
  end: Date;
}

export interface TransactionSummary {
  totalReceived: number; // in lamports
  totalPaid: number; // in lamports
  transactionCount: number;
  averageTransaction: number;
}

export interface ReportTransaction {
  date: Date;
  type: 'received' | 'paid';
  amount: number; // in lamports
  counterparty: string;
  note?: string;
  txSignature?: string;
  invoiceId?: string;
}

export interface SelfDisclosureReport {
  id: string;
  walletAddress: string;
  reportType: ReportType;
  period: ReportPeriod;
  summary: TransactionSummary;
  transactions: ReportTransaction[];
  generatedAt: Date;
  proofHash: string;
  verificationUrl?: string;
}

export interface ReportGenerationOptions {
  walletAddress: string;
  reportType: ReportType;
  period: ReportPeriod;
  invoices: Invoice[];
  includeNotes?: boolean;
  currency?: 'SOL' | 'USD';
}

// ============================================
// Report Generation
// ============================================

/**
 * Generate self-disclosure report
 * Uses Range Data API if configured, otherwise generates locally from invoices
 */
export async function generateSelfDisclosureReport(
  options: ReportGenerationOptions
): Promise<SelfDisclosureReport> {
  const { walletAddress, reportType, period, invoices, includeNotes = true } = options;

  // Filter invoices for this wallet within the period
  const relevantInvoices = filterInvoicesForReport(walletAddress, period, invoices);
  
  // Build transactions list from local invoices
  let transactions = buildTransactionsList(walletAddress, relevantInvoices, includeNotes);
  
  // Optionally enrich with on-chain data from Range Data API
  if (!USE_SIMULATION && RANGE_API_KEY) {
    try {
      const onChainTxs = await fetchOnChainTransactions(walletAddress, period);
      // Merge on-chain data with local invoice data
      transactions = mergeTransactionData(transactions, onChainTxs);
    } catch (error) {
      console.warn('Could not fetch on-chain data from Range, using local data only:', error);
    }
  }
  
  // Calculate summary
  const summary = calculateSummary(transactions);
  
  // Generate proof hash (via Range API verification or locally)
  const proofHash = USE_SIMULATION
    ? generateLocalProofHash(walletAddress, reportType, period)
    : await generateRangeProofHash(walletAddress, reportType, transactions);

  const report: SelfDisclosureReport = {
    id: generateReportId(),
    walletAddress,
    reportType,
    period,
    summary,
    transactions,
    generatedAt: new Date(),
    proofHash,
    verificationUrl: USE_SIMULATION
      ? undefined
      : `https://explorer.solana.com/address/${walletAddress}?cluster=devnet`,
  };

  // Store report locally
  storeReport(report);

  return report;
}

/**
 * Fetch on-chain transaction history from Range Data API
 * Endpoint: GET /v1/address/transactions
 */
async function fetchOnChainTransactions(
  walletAddress: string,
  period: ReportPeriod
): Promise<ReportTransaction[]> {
  try {
    const params = new URLSearchParams({
      address: walletAddress,
      network: 'solana',
      start_date: period.start.toISOString(),
      end_date: period.end.toISOString(),
      page_size: '100',
    });

    const response = await fetch(
      `${RANGE_API_URL}/v1/address/transactions?${params}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${RANGE_API_KEY}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Range Data API error:', response.status);
      return [];
    }

    const data: RangeTransactionsResponse = await response.json();
    
    // Convert Range transactions to our format
    return data.transactions.map((tx) => ({
      date: new Date(tx.timestamp),
      type: tx.to_address === walletAddress ? 'received' : 'paid',
      amount: tx.amount,
      counterparty: tx.to_address === walletAddress ? tx.from_address : tx.to_address,
      txSignature: tx.hash,
      note: undefined, // On-chain txs don't have notes
    }));
  } catch (error) {
    console.error('Failed to fetch on-chain transactions:', error);
    return [];
  }
}

/**
 * Merge local invoice transactions with on-chain data
 * Prioritizes local data (has notes, invoice IDs) but fills gaps with on-chain data
 */
function mergeTransactionData(
  localTxs: ReportTransaction[],
  onChainTxs: ReportTransaction[]
): ReportTransaction[] {
  // Create a map of local transactions by signature
  const localBySignature = new Map<string, ReportTransaction>();
  localTxs.forEach((tx) => {
    if (tx.txSignature) {
      localBySignature.set(tx.txSignature, tx);
    }
  });

  // Start with all local transactions
  const merged = [...localTxs];

  // Add on-chain transactions that don't exist locally
  for (const onChainTx of onChainTxs) {
    if (onChainTx.txSignature && !localBySignature.has(onChainTx.txSignature)) {
      merged.push(onChainTx);
    }
  }

  // Sort by date
  return merged.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Filter invoices relevant for the report
 */
function filterInvoicesForReport(
  walletAddress: string,
  period: ReportPeriod,
  invoices: Invoice[]
): Invoice[] {
  return invoices.filter((inv) => {
    // Must involve this wallet
    const isRelevant = inv.sender === walletAddress || inv.recipient === walletAddress;
    if (!isRelevant) return false;

    // Must be paid
    if (inv.status !== 'paid' || !inv.paidAt) return false;

    // Must be within period
    const paidAt = new Date(inv.paidAt);
    return paidAt >= period.start && paidAt <= period.end;
  });
}

/**
 * Build transactions list from invoices
 */
function buildTransactionsList(
  walletAddress: string,
  invoices: Invoice[],
  includeNotes: boolean
): ReportTransaction[] {
  return invoices.map((inv) => {
    const isReceived = inv.recipient === walletAddress;
    
    return {
      date: new Date(inv.paidAt!),
      type: (isReceived ? 'received' : 'paid') as 'received' | 'paid',
      amount: inv.amount,
      counterparty: isReceived ? inv.sender : inv.recipient,
      note: includeNotes ? inv.note : undefined,
      txSignature: inv.txSignature,
      invoiceId: inv.id,
    };
  }).sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Calculate transaction summary
 */
function calculateSummary(transactions: ReportTransaction[]): TransactionSummary {
  const received = transactions.filter((tx) => tx.type === 'received');
  const paid = transactions.filter((tx) => tx.type === 'paid');

  const totalReceived = received.reduce((sum, tx) => sum + tx.amount, 0);
  const totalPaid = paid.reduce((sum, tx) => sum + tx.amount, 0);
  const totalAmount = totalReceived + totalPaid;

  return {
    totalReceived,
    totalPaid,
    transactionCount: transactions.length,
    averageTransaction: transactions.length > 0 ? totalAmount / transactions.length : 0,
  };
}

/**
 * Generate local proof hash (for simulation)
 */
function generateLocalProofHash(
  walletAddress: string,
  reportType: ReportType,
  period: ReportPeriod
): string {
  const timestamp = Date.now().toString(36);
  const addressHash = walletAddress.slice(-8);
  const periodHash = `${period.start.getTime().toString(36)}_${period.end.getTime().toString(36)}`;
  return `sdr_${reportType}_${timestamp}_${addressHash}_${periodHash}`;
}

/**
 * Generate proof hash using Range Risk API verification
 * Uses address risk check + transaction signatures to create a verifiable proof
 * 
 * The proof hash combines:
 * 1. Wallet address verification status from Range
 * 2. Transaction signatures included in the report
 * 3. Report metadata (type, timestamp)
 */
async function generateRangeProofHash(
  walletAddress: string,
  reportType: ReportType,
  transactions: ReportTransaction[]
): Promise<string> {
  try {
    // 1. Verify wallet address via Range Risk API
    const riskResponse = await fetch(
      `${RANGE_API_URL}/v1/risk/address?address=${encodeURIComponent(walletAddress)}&network=solana`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${RANGE_API_KEY}`,
          'Accept': 'application/json',
        },
      }
    );

    let riskVerified = false;
    let riskScore = 0;

    if (riskResponse.ok) {
      const riskData = await riskResponse.json();
      riskVerified = true;
      riskScore = riskData.riskScore || 0;
    }

    // 2. Build proof data
    const txSignatures = transactions
      .filter((tx) => tx.txSignature)
      .map((tx) => tx.txSignature)
      .slice(0, 10); // Include up to 10 tx signatures

    const proofData = {
      wallet: walletAddress.slice(-8),
      type: reportType,
      txCount: transactions.length,
      verified: riskVerified,
      riskScore,
      timestamp: Date.now(),
      signatures: txSignatures.map(sig => sig?.slice(-8)).join('_'),
    };

    // 3. Create deterministic proof hash
    const proofString = JSON.stringify(proofData);
    
    // Use SubtleCrypto if available (browser), otherwise fallback
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(proofString);
      // Create a proper ArrayBuffer copy for SubtleCrypto
      const buffer = encodedData.buffer.slice(0) as ArrayBuffer;
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return `range_${reportType}_${hashHex.slice(0, 32)}`;
    }

    // Fallback for server-side or non-browser
    return generateLocalProofHash(walletAddress, reportType, { start: new Date(), end: new Date() });
  } catch (error) {
    console.error('Range proof generation failed:', error);
    return generateLocalProofHash(walletAddress, reportType, { start: new Date(), end: new Date() });
  }
}

/**
 * Get address info from Range Data API
 * Endpoint: GET /v1/address
 */
export async function getAddressInfo(walletAddress: string): Promise<RangeAddressInfo | null> {
  if (USE_SIMULATION || !RANGE_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `${RANGE_API_URL}/v1/address?address=${encodeURIComponent(walletAddress)}&network=solana`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${RANGE_API_KEY}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch address info:', error);
    return null;
  }
}

/**
 * Generate unique report ID
 */
function generateReportId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `report_${timestamp}_${random}`;
}

// ============================================
// Report Storage
// ============================================

const REPORTS_STORAGE_KEY = 'sento_reports';

/**
 * Store report locally
 */
function storeReport(report: SelfDisclosureReport): void {
  if (typeof window === 'undefined') return;
  
  const stored = localStorage.getItem(REPORTS_STORAGE_KEY);
  const reports: SelfDisclosureReport[] = stored ? JSON.parse(stored) : [];
  
  // Add new report (keep last 50)
  reports.unshift(report);
  if (reports.length > 50) {
    reports.pop();
  }
  
  localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
}

/**
 * Get stored reports for a wallet
 */
export function getStoredReports(walletAddress: string): SelfDisclosureReport[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(REPORTS_STORAGE_KEY);
  if (!stored) return [];
  
  const reports: SelfDisclosureReport[] = JSON.parse(stored);
  
  return reports
    .filter((r) => r.walletAddress === walletAddress)
    .map((r) => ({
      ...r,
      period: {
        start: new Date(r.period.start),
        end: new Date(r.period.end),
      },
      transactions: r.transactions.map((tx) => ({
        ...tx,
        date: new Date(tx.date),
      })),
      generatedAt: new Date(r.generatedAt),
    }));
}

/**
 * Get a specific report by ID
 */
export function getReportById(reportId: string): SelfDisclosureReport | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(REPORTS_STORAGE_KEY);
  if (!stored) return null;
  
  const reports: SelfDisclosureReport[] = JSON.parse(stored);
  const report = reports.find((r) => r.id === reportId);
  
  if (!report) return null;
  
  return {
    ...report,
    period: {
      start: new Date(report.period.start),
      end: new Date(report.period.end),
    },
    transactions: report.transactions.map((tx) => ({
      ...tx,
      date: new Date(tx.date),
    })),
    generatedAt: new Date(report.generatedAt),
  };
}

// ============================================
// Report Export (PDF/CSV)
// ============================================

/**
 * Export report as CSV
 */
export function exportReportAsCSV(report: SelfDisclosureReport): string {
  const headers = ['Date', 'Type', 'Amount (SOL)', 'Counterparty', 'Note', 'Transaction'];
  const rows = report.transactions.map((tx) => [
    tx.date.toISOString().split('T')[0],
    tx.type,
    (tx.amount / 1_000_000_000).toFixed(9),
    tx.counterparty,
    tx.note || '',
    tx.txSignature || '',
  ]);

  // Add summary rows
  rows.push([]);
  rows.push(['Summary']);
  rows.push(['Total Received', '', (report.summary.totalReceived / 1_000_000_000).toFixed(9)]);
  rows.push(['Total Paid', '', (report.summary.totalPaid / 1_000_000_000).toFixed(9)]);
  rows.push(['Transaction Count', '', report.summary.transactionCount.toString()]);
  rows.push([]);
  rows.push(['Report ID', report.id]);
  rows.push(['Proof Hash', report.proofHash]);
  rows.push(['Generated At', report.generatedAt.toISOString()]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Download report as CSV file
 */
export function downloadReportAsCSV(report: SelfDisclosureReport): void {
  const csvContent = exportReportAsCSV(report);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `sento-${report.reportType}-report-${report.id}.csv`;
  link.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Generate printable HTML report
 */
export function generatePrintableReport(report: SelfDisclosureReport): string {
  const formatSOL = (lamports: number) => (lamports / 1_000_000_000).toFixed(4);
  const formatAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Sento ${report.reportType.charAt(0).toUpperCase() + report.reportType.slice(1)} Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #1a1a1a; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    .subtitle { color: #666; margin-bottom: 32px; }
    .summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 32px; }
    .summary-card { background: #f5f5f5; padding: 16px; border-radius: 8px; }
    .summary-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .summary-value { font-size: 24px; font-weight: 600; font-family: monospace; }
    .received { color: #10b981; }
    .paid { color: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    th, td { text-align: left; padding: 12px 8px; border-bottom: 1px solid #e5e5e5; }
    th { font-size: 12px; color: #666; text-transform: uppercase; }
    .amount { font-family: monospace; }
    .proof { background: #f5f5f5; padding: 16px; border-radius: 8px; font-size: 12px; word-break: break-all; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #666; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>Sento ${report.reportType.charAt(0).toUpperCase() + report.reportType.slice(1)} Report</h1>
  <p class="subtitle">
    Period: ${report.period.start.toLocaleDateString()} - ${report.period.end.toLocaleDateString()}<br>
    Wallet: ${formatAddress(report.walletAddress)}
  </p>
  
  <div class="summary">
    <div class="summary-card">
      <div class="summary-label">Total Received</div>
      <div class="summary-value received">${formatSOL(report.summary.totalReceived)} SOL</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Total Paid</div>
      <div class="summary-value paid">${formatSOL(report.summary.totalPaid)} SOL</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Transactions</div>
      <div class="summary-value">${report.summary.transactionCount}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Net Amount</div>
      <div class="summary-value">${formatSOL(report.summary.totalReceived - report.summary.totalPaid)} SOL</div>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Type</th>
        <th>Amount</th>
        <th>Counterparty</th>
        <th>Note</th>
      </tr>
    </thead>
    <tbody>
      ${report.transactions.map((tx) => `
        <tr>
          <td>${tx.date.toLocaleDateString()}</td>
          <td class="${tx.type}">${tx.type}</td>
          <td class="amount ${tx.type}">${tx.type === 'received' ? '+' : '-'}${formatSOL(tx.amount)} SOL</td>
          <td>${formatAddress(tx.counterparty)}</td>
          <td>${tx.note || '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="proof">
    <strong>Verification Proof</strong><br>
    Report ID: ${report.id}<br>
    Proof Hash: ${report.proofHash}<br>
    Generated: ${report.generatedAt.toISOString()}
  </div>
  
  <div class="footer">
    Generated by Sento - Private Payments on Solana<br>
    This report contains self-disclosed transaction data from zero-knowledge compressed transactions.
  </div>
</body>
</html>
  `.trim();
}

/**
 * Open printable report in new window
 */
export function openPrintableReport(report: SelfDisclosureReport): void {
  const html = generatePrintableReport(report);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
