// ============================================
// Sento - Compliance First-Time Modal
// Shows once to introduce compliance feature
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useCompliance } from '@/lib/hooks/useCompliance';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

const FIRST_TIME_MODAL_KEY = 'sento_compliance_first_time_shown';

export function ComplianceFirstTimeModal() {
  const { publicKey } = useWallet();
  const { enableCompliance, isChecking } = useCompliance();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!publicKey) return;

    // Check if we've shown this modal before
    const walletAddress = publicKey.toBase58();
    const shown = localStorage.getItem(`${FIRST_TIME_MODAL_KEY}_${walletAddress}`);
    
    if (!shown) {
      setShow(true);
    }
  }, [publicKey]);

  const handleEnable = async () => {
    await enableCompliance();
    if (publicKey) {
      localStorage.setItem(`${FIRST_TIME_MODAL_KEY}_${publicKey.toBase58()}`, 'true');
    }
    setShow(false);
  };

  const handleDismiss = () => {
    if (publicKey) {
      localStorage.setItem(`${FIRST_TIME_MODAL_KEY}_${publicKey.toBase58()}`, 'true');
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[rgba(0,0,0,0.7)] backdrop-blur-sm">
      <Card className="max-w-[420px] w-full" padding="none">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-lg bg-[rgba(94,217,179,0.12)] flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[#5ED9B3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-[18px] font-medium text-[#FAFAFA] mb-1">
                Optional Compliance Verification
              </h2>
              <p className="text-[13px] text-[#52525B] leading-[1.5]">
                Verify your wallet for regulatory compliance while maintaining full privacy.
              </p>
            </div>
          </div>

          {/* ZK Messaging */}
          <div className="mb-6 p-4 rounded-lg bg-[rgba(94,217,179,0.06)] border border-[rgba(94,217,179,0.12)]">
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-[#5ED9B3] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m4.5 0a12.05 12.05 0 003.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              <div>
                <h3 className="text-[12px] font-medium text-[#FAFAFA] mb-1.5">
                  Zero-Knowledge Proof
                </h3>
                <p className="text-[11px] text-[#52525B] leading-[1.5]">
                  Compliance verification uses zero-knowledge proofs. Your identity and transaction history remain completely private. Only compliance status is verified.
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mb-6 space-y-2">
            {[
              { text: 'Verify wallet against sanctions lists' },
              { text: 'No identity or transaction data revealed' },
              { text: 'Optional — enable or disable anytime' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-[#5ED9B3] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[12px] text-[#71717A]">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={handleEnable}
              disabled={isChecking}
              className="flex-1"
            >
              {isChecking ? 'Verifying...' : 'Enable Compliance'}
            </Button>
            <Button
              variant="secondary"
              onClick={handleDismiss}
              disabled={isChecking}
            >
              Maybe Later
            </Button>
          </div>

          {/* Powered by */}
          <p className="text-[10px] text-[#3F3F46] text-center mt-4">
            Powered by Range Protocol
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
