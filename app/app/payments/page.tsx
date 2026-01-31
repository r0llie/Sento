// ============================================
// Sento - Payments Hub Page
// Tabbed interface: Create Invoice | Batch Payments
// ============================================

'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card } from '@/components/ui/Card';
import { WalletButton } from '@/components/wallet/WalletButton';
import CreateInvoiceContent from './CreateInvoiceTab';
import BatchPaymentContent from './BatchPaymentTab';

export default function PaymentsPage() {
  const { connected } = useWallet();
  const [activeTab, setActiveTab] = useState<'invoice' | 'batch'>('invoice');

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pt-16 bg-[#09090B]">
        <Card className="max-w-[360px] w-full text-center" padding="md">
          <div className="w-12 h-12 mx-auto mb-5 rounded-lg bg-[rgba(94,217,179,0.08)] flex items-center justify-center">
            <svg className="w-5 h-5 text-[#5ED9B3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>
          <h2 className="text-[18px] font-medium text-[#FAFAFA] tracking-[-0.01em] mb-1">Payments</h2>
          <p className="text-[13px] text-[#52525B] mb-6 leading-[1.5]">Connect your wallet to create invoices or batch payments</p>
          <WalletButton />
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
              Payments
            </h1>
            <p className="text-[13px] text-[#52525B]">
              Create single invoices or send batch payments
            </p>
          </div>

          {/* Tabs - Matching Balance Page Style */}
          <div className="flex items-center gap-1 border-b border-[rgba(255,255,255,0.04)]">
            <button
              onClick={() => setActiveTab('invoice')}
              className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 ${
                activeTab === 'invoice'
                  ? 'border-[#5BB98C] text-[#FAFAFA]'
                  : 'border-transparent text-[#52525B] hover:text-[#71717A]'
              }`}
            >
              Create Invoice
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 ${
                activeTab === 'batch'
                  ? 'border-[#5BB98C] text-[#FAFAFA]'
                  : 'border-transparent text-[#52525B] hover:text-[#71717A]'
              }`}
            >
              Batch Payments
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'invoice' ? <CreateInvoiceContent /> : <BatchPaymentContent />}
        </div>
      </div>
    </div>
  );
}
