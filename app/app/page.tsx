// ============================================
// Sento - Premium Landing Page
// Dramatic, calm, luxurious
// Target: Stripe + Linear + Apple dark mode
// ============================================

'use client';

import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from '@/components/wallet/WalletButton';

// Refined icon components - consistent stroke weight
const ShieldLockIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const BoltIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);

const CurrencyIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const KeyIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const features = [
  {
    icon: ShieldLockIcon,
    title: 'Hidden Amounts',
    description: 'Transaction amounts encrypted with zero-knowledge proofs. Only you and the recipient see the value.',
  },
  {
    icon: BoltIcon,
    title: 'Instant Settlement',
    description: 'Sub-second finality on Solana. Same speed you expect, with privacy built in.',
  },
  {
    icon: CurrencyIcon,
    title: 'Minimal Fees',
    description: 'Fractions of a cent per transaction. No subscriptions, no hidden charges.',
  },
  {
    icon: DocumentIcon,
    title: 'Private Invoicing',
    description: 'Generate shareable payment links. Payers complete transactions without seeing your history.',
  },
  {
    icon: KeyIcon,
    title: 'Non-Custodial',
    description: 'Your keys remain yours. We never access your funds or private credentials.',
  },
  {
    icon: CheckCircleIcon,
    title: 'Optional Compliance',
    description: 'Enable regulatory verification without exposing transaction details.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Create Invoice',
    description: 'Specify recipient, amount, and an optional note. Generate an instant shareable link.',
  },
  {
    number: '02',
    title: 'Share & Pay',
    description: 'Send the link to your payer. They connect a wallet and complete payment in seconds.',
  },
  {
    number: '03',
    title: 'Receive Privately',
    description: 'Funds arrive in your private balance. Withdraw to your wallet when ready.',
  },
];

export default function HomePage() {
  const { connected } = useWallet();

  return (
    <div className="relative bg-[#09090B]">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-32">
        {/* Minimal background - no blur, sharp */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(94,217,179,0.03)_0%,transparent_50%)]" />
        </div>
        
        <div className="relative max-w-[640px] mx-auto text-center">
          {/* Brand logo */}
          <div className="mb-8">
            <img 
              src="/slogotp.png" 
              alt="Sento" 
              className="h-20 sm:h-24 w-auto mx-auto"
            />
          </div>

          {/* PRODUCT-FIRST: Main headline (what you get) */}
          <h1 className="text-[44px] sm:text-[52px] md:text-[56px] font-medium tracking-[-0.035em] text-[#FFFFFF] leading-[1.05] mb-5">
            Get paid privately.
          </h1>

          {/* TECH-SECOND: Supporting line (how it works) */}
          <p className="text-[15px] sm:text-[16px] text-[#52525B] leading-[1.6] max-w-[400px] mx-auto mb-10">
            On Solana. Secured by zero-knowledge cryptography.
          </p>

          {/* CTA - LEVEL A (primary) vs LEVEL C (secondary) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {connected ? (
              <>
                <Link href="/invoice/create">
                  <button className="h-11 px-6 rounded-[6px] bg-[#5ED9B3] text-[#09090B] text-[13px] font-semibold hover:bg-[#6FE9C3] transition-colors">
                    Create Invoice
                  </button>
                </Link>
                <Link href="/balance">
                  <button className="h-11 px-5 text-[#52525B] text-[13px] font-medium hover:text-[#71717A] transition-colors">
                    View Balance →
                  </button>
                </Link>
              </>
            ) : (
              <>
                <WalletButton />
                <a
                  href="#features"
                  className="h-11 px-4 flex items-center text-[#52525B] text-[13px] font-medium hover:text-[#71717A] transition-colors"
                >
                  Learn more →
                </a>
              </>
            )}
          </div>
        </div>

        {/* Stats - LEVEL C (muted) */}
        <div className="relative mt-16 pt-8 border-t border-[rgba(255,255,255,0.04)] w-full max-w-[400px]">
          <div className="flex items-center justify-center gap-10 sm:gap-14">
            {[
              { value: '100%', label: 'Private' },
              { value: '<$0.01', label: 'Per tx' },
              { value: 'ZK', label: 'Secured' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-[20px] font-medium text-[#71717A] tracking-[-0.02em] font-mono">{stat.value}</p>
                <p className="text-[10px] text-[#3F3F46] mt-1 uppercase tracking-[0.1em] font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 px-6 border-t border-[rgba(255,255,255,0.04)]">
        <div className="max-w-[1000px] mx-auto">
          {/* Section header - LEVEL C hierarchy */}
          <div className="text-center mb-14">
            <p className="text-[10px] font-semibold text-[#52525B] uppercase tracking-[0.1em] mb-3">
              Why Sento
            </p>
            <h2 className="text-[28px] sm:text-[32px] font-medium text-[#FAFAFA] tracking-[-0.02em] mb-3">
              Privacy-first infrastructure
            </h2>
            <p className="text-[14px] text-[#52525B] max-w-[400px] mx-auto leading-[1.55]">
              Every Solana transaction is public. We change that with zero-knowledge cryptography.
            </p>
          </div>

          {/* Feature grid - sharper cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-5 rounded-lg bg-[#111113] border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.07)] transition-all duration-150"
              >
                <div className="w-9 h-9 rounded-md bg-[rgba(255,255,255,0.03)] flex items-center justify-center text-[#52525B] mb-4 group-hover:bg-[rgba(94,217,179,0.08)] group-hover:text-[#5ED9B3] transition-colors">
                  <feature.icon />
                </div>
                <h3 className="text-[14px] font-medium text-[#FAFAFA] mb-1.5">{feature.title}</h3>
                <p className="text-[13px] text-[#52525B] leading-[1.5]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-24 px-6 bg-[#0A0A0C]">
        <div className="max-w-[640px] mx-auto">
          {/* Section header */}
          <div className="text-center mb-12">
            <p className="text-[10px] font-semibold text-[#52525B] uppercase tracking-[0.1em] mb-3">
              How It Works
            </p>
            <h2 className="text-[28px] font-medium text-[#FAFAFA] tracking-[-0.02em]">
              Three steps to privacy
            </h2>
          </div>

          {/* Steps - sharper */}
          <div className="space-y-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="flex gap-4 p-5 rounded-lg bg-[#111113] border border-[rgba(255,255,255,0.05)]"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-md bg-[#5ED9B3] flex items-center justify-center text-[#09090B] text-[13px] font-semibold">
                  {step.number}
                </div>
                <div>
                  <h3 className="text-[14px] font-medium text-[#FAFAFA] mb-1">
                    {step.title}
                  </h3>
                  <p className="text-[13px] text-[#52525B] leading-[1.5]">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Privacy Matters - Surveillance Warning */}
      <section className="relative py-24 px-6 border-t border-[rgba(255,255,255,0.04)]">
        <div className="max-w-[720px] mx-auto">
          {/* Section header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
              <span className="text-[10px] font-semibold text-[#EF4444] uppercase tracking-[0.08em]">Privacy Crisis</span>
            </div>
            <h2 className="text-[28px] font-medium text-[#FAFAFA] tracking-[-0.02em] mb-3">
              Why Privacy Matters
            </h2>
            <p className="text-[14px] text-[#52525B] max-w-[500px] mx-auto leading-[1.55]">
              Every Solana transaction is public. Your salary, your purchases, your entire financial life — visible to anyone.
            </p>
          </div>

          {/* Surveillance Examples */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {[
              { 
                icon: (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Salary Exposure', 
                desc: 'Anyone can see exactly how much you earn' 
              },
              { 
                icon: (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                ),
                title: 'Net Worth Tracking', 
                desc: 'Your wallet balance is public knowledge' 
              },
              { 
                icon: (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                ),
                title: 'Transaction History', 
                desc: 'Complete spending patterns visible' 
              },
              { 
                icon: (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                  </svg>
                ),
                title: 'Business Intelligence', 
                desc: 'Competitors can analyze your finances' 
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-4 rounded-lg bg-[rgba(239,68,68,0.03)] border border-[rgba(239,68,68,0.08)]">
                <div className="w-8 h-8 rounded-md bg-[rgba(239,68,68,0.08)] flex items-center justify-center text-[#EF4444] flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-[13px] font-medium text-[#FAFAFA] mb-0.5">{item.title}</h3>
                  <p className="text-[12px] text-[#52525B]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Learn More CTA */}
          <div className="text-center">
            <Link href="/learn">
              <button className="h-10 px-5 rounded-[6px] bg-transparent text-[#52525B] text-[12px] font-medium border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] hover:text-[#71717A] transition-all">
                Learn more about wallet surveillance →
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-24 px-6 bg-[#0A0A0C]">
        <div className="max-w-[480px] mx-auto">
          <div className="p-8 rounded-lg bg-[#111113] border border-[rgba(255,255,255,0.05)] text-center">
            <h2 className="text-[22px] font-medium text-[#FAFAFA] tracking-[-0.02em] mb-3">
              Ready to go private?
            </h2>
            <p className="text-[13px] text-[#52525B] mb-6 leading-[1.55]">
              Connect your wallet and start receiving private payments.
            </p>
            
            {connected ? (
              <Link href="/invoice/create">
                <button className="h-11 px-6 rounded-[6px] bg-[#5ED9B3] text-[#09090B] text-[13px] font-semibold hover:bg-[#6FE9C3] transition-colors">
                  Create Your First Invoice
                </button>
              </Link>
            ) : (
              <WalletButton />
            )}
          </div>
        </div>
      </section>

      {/* Footer - minimal */}
      <footer className="py-6 px-6 border-t border-[rgba(255,255,255,0.04)]">
        <div className="max-w-[1000px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/slogotp.png" alt="Sento" className="h-7 w-auto" />
            <span className="text-[12px] font-medium text-[#52525B]">Sento</span>
          </div>
          
          <p className="text-[11px] text-[#3F3F46]">
            © 2026 Sento. Solana Privacy Hackathon.
          </p>
          
          <div className="flex items-center gap-4">
            <a href="https://lightprotocol.com" target="_blank" rel="noopener" className="text-[11px] text-[#3F3F46] hover:text-[#52525B] transition-colors">
              Light Protocol
            </a>
            <a href="https://helius.dev" target="_blank" rel="noopener" className="text-[11px] text-[#3F3F46] hover:text-[#52525B] transition-colors">
              Helius
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
