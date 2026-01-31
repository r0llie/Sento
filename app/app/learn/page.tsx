// ============================================
// Sento - Privacy Education Page
// "Why Privacy Matters" - Encrypt.trade Bounty
// ============================================

'use client';

import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { WalletButton } from '@/components/wallet/WalletButton';

// Icons
const EyeIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

// Surveillance examples
const surveillanceExamples = [
  {
    title: 'Salary Exposure',
    description: 'Your employer pays you 5,000 USDC. Now everyone knows your exact salary, including future employers, landlords, and competitors.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Purchase Tracking',
    description: 'Buy medicine at an online pharmacy. That transaction is permanently linked to your wallet and visible to anyone.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
  {
    title: 'Net Worth Calculation',
    description: 'Analytics companies can calculate your total net worth by analyzing all your wallet activity and holdings.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: 'Business Intelligence',
    description: 'Competitors can see who your customers are, how much they pay, and reverse-engineer your business model.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
];

// ZK Compression explanation
const zkSteps = [
  {
    step: 1,
    title: 'Compress',
    description: 'Convert your regular SOL into compressed (private) SOL. The amount disappears from public view.',
  },
  {
    step: 2,
    title: 'Transfer',
    description: 'Send payments using zero-knowledge proofs. The blockchain verifies the transaction without revealing the amount.',
  },
  {
    step: 3,
    title: 'Claim',
    description: 'Recipients can claim their private balance back to regular SOL whenever they choose.',
  },
];

// FAQ items
const faqItems = [
  {
    question: 'Is this legal?',
    answer: 'Yes. Privacy is a fundamental right. Sento also supports optional compliance features for users who need to provide transaction records to authorities.',
  },
  {
    question: 'Can I still pay taxes?',
    answer: 'Absolutely. Sento provides self-disclosure reports that you can generate and share with tax authorities. You control when and what to disclose.',
  },
  {
    question: 'How is this different from mixers?',
    answer: 'Sento uses zero-knowledge proofs, not mixing. Your funds are never pooled with others. This is cryptographic privacy, not obfuscation.',
  },
  {
    question: 'What about money laundering?',
    answer: 'Sento integrates with Range for wallet screening. Users can enable compliance mode to prove they are not sanctioned while keeping amounts private.',
  },
];

export default function LearnPage() {
  const { connected } = useWallet();

  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-[840px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
            <span className="text-[11px] font-medium text-[#EF4444] uppercase tracking-wider">Privacy Crisis</span>
          </div>
          
          <h1 className="text-[36px] sm:text-[48px] font-medium text-[#FAFAFA] tracking-[-0.03em] leading-[1.1] mb-6">
            Every Solana transaction is
            <span className="text-[#EF4444]"> public forever</span>
          </h1>
          
          <p className="text-[16px] text-[#71717A] leading-[1.6] max-w-[600px] mx-auto mb-8">
            When you receive a payment on Solana, anyone can see how much you earned, 
            track your spending, and build a complete financial profile of you.
          </p>

          <div className="flex items-center justify-center gap-4">
            {connected ? (
              <Link href="/invoice/create">
                <Button size="lg">Get Private Payments</Button>
              </Link>
            ) : (
              <WalletButton />
            )}
            <a href="#surveillance" className="text-[13px] text-[#52525B] hover:text-[#71717A]">
              Learn more →
            </a>
          </div>
        </div>
      </section>

      {/* Surveillance Section */}
      <section id="surveillance" className="py-20 px-6 bg-[#0A0A0C]">
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center mb-12">
            <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-[rgba(239,68,68,0.1)] flex items-center justify-center">
              <EyeIcon />
            </div>
            <h2 className="text-[28px] font-medium text-[#FAFAFA] tracking-[-0.02em] mb-3">
              Wallet Surveillance is Real
            </h2>
            <p className="text-[14px] text-[#52525B] max-w-[500px] mx-auto">
              Companies actively track and analyze blockchain transactions. 
              Here&apos;s what they can learn about you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {surveillanceExamples.map((example) => (
              <Card key={example.title} padding="md">
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-md bg-[rgba(239,68,68,0.08)] flex items-center justify-center text-[#EF4444] flex-shrink-0">
                      {example.icon}
                    </div>
                    <div>
                      <h3 className="text-[15px] font-medium text-[#FAFAFA] mb-2">{example.title}</h3>
                      <p className="text-[13px] text-[#52525B] leading-[1.5]">{example.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Real Data Box */}
          <div className="mt-8 p-6 rounded-lg bg-[#111113] border border-[rgba(239,68,68,0.2)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-md bg-[rgba(239,68,68,0.1)] flex items-center justify-center">
                <ChartIcon />
              </div>
              <h3 className="text-[14px] font-medium text-[#EF4444]">Try It Yourself</h3>
            </div>
            <p className="text-[13px] text-[#71717A] mb-4">
              Go to any Solana explorer (like Solscan or Solana Explorer), enter any wallet address, 
              and see their complete transaction history, token holdings, and NFT collection. 
              This is the level of surveillance everyone on Solana is subject to.
            </p>
            <a 
              href="https://solscan.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[13px] text-[#EF4444] hover:text-[#F87171]"
            >
              Try Solscan →
            </a>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-6">
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center mb-12">
            <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-[rgba(94,217,179,0.1)] flex items-center justify-center">
              <ShieldIcon />
            </div>
            <h2 className="text-[28px] font-medium text-[#FAFAFA] tracking-[-0.02em] mb-3">
              How Sento Protects You
            </h2>
            <p className="text-[14px] text-[#52525B] max-w-[500px] mx-auto">
              Sento uses zero-knowledge compression to hide your payment amounts on-chain 
              while still settling on Solana.
            </p>
          </div>

          {/* ZK Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {zkSteps.map((step) => (
              <div key={step.step} className="p-6 rounded-lg bg-[#111113] border border-[rgba(255,255,255,0.05)]">
                <div className="w-10 h-10 rounded-md bg-[#5ED9B3] flex items-center justify-center text-[#09090B] font-semibold text-[14px] mb-4">
                  {step.step}
                </div>
                <h3 className="text-[15px] font-medium text-[#FAFAFA] mb-2">{step.title}</h3>
                <p className="text-[13px] text-[#52525B] leading-[1.5]">{step.description}</p>
              </div>
            ))}
          </div>

          {/* Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Without Sento */}
            <div className="p-6 rounded-lg bg-[rgba(239,68,68,0.04)] border border-[rgba(239,68,68,0.15)]">
              <div className="flex items-center gap-2 mb-4">
                <EyeIcon />
                <h3 className="text-[15px] font-medium text-[#EF4444]">Without Sento</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Payment amounts visible to everyone',
                  'Transaction history fully exposed',
                  'Wallet balance public knowledge',
                  'Financial profile can be built',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] text-[#71717A]">
                    <span className="text-[#EF4444] mt-0.5">×</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* With Sento */}
            <div className="p-6 rounded-lg bg-[rgba(94,217,179,0.04)] border border-[rgba(94,217,179,0.15)]">
              <div className="flex items-center gap-2 mb-4">
                <LockIcon />
                <h3 className="text-[15px] font-medium text-[#5ED9B3]">With Sento</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Payment amounts hidden on-chain',
                  'Only cryptographic proofs visible',
                  'Private balance known only to you',
                  'Selective disclosure when needed',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] text-[#71717A]">
                    <span className="text-[#5ED9B3] mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 bg-[#0A0A0C]">
        <div className="max-w-[720px] mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-[28px] font-medium text-[#FAFAFA] tracking-[-0.02em] mb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-[14px] text-[#52525B]">
              Common questions about privacy and Sento
            </p>
          </div>

          <div className="space-y-4">
            {faqItems.map((item) => (
              <div key={item.question} className="p-5 rounded-lg bg-[#111113] border border-[rgba(255,255,255,0.05)]">
                <h3 className="text-[14px] font-medium text-[#FAFAFA] mb-2">{item.question}</h3>
                <p className="text-[13px] text-[#52525B] leading-[1.6]">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-[640px] mx-auto text-center">
          <h2 className="text-[24px] font-medium text-[#FAFAFA] tracking-[-0.02em] mb-3">
            Ready to protect your privacy?
          </h2>
          <p className="text-[14px] text-[#52525B] mb-8">
            Start receiving private payments today. No KYC required.
          </p>
          
          {connected ? (
            <div className="flex items-center justify-center gap-4">
              <Link href="/invoice/create">
                <Button size="lg">Create Invoice</Button>
              </Link>
              <Link href="/reports">
                <Button variant="secondary" size="lg">View Reports</Button>
              </Link>
            </div>
          ) : (
            <WalletButton />
          )}
        </div>
      </section>

      {/* Footer Note */}
      <div className="py-8 px-6 border-t border-[rgba(255,255,255,0.04)]">
        <p className="text-center text-[11px] text-[#3F3F46]">
          Powered by Light Protocol (ZK Compression) and Helius RPC
        </p>
      </div>
    </div>
  );
}
