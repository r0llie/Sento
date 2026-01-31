// ============================================
// Sento - Compliance Toggle
// Premium settings component
// ============================================

'use client';

import { useState } from 'react';
import { useCompliance } from '@/lib/hooks/useCompliance';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils/format';

export function ComplianceToggle() {
  const {
    isEnabled,
    isChecking,
    isCompliant,
    proof,
    lastCheck,
    error,
    enableCompliance,
    disableCompliance,
    recheckCompliance,
  } = useCompliance();

  const [showDetails, setShowDetails] = useState(false);

  return (
    <Card padding="none">
      <CardContent>
        {/* Header */}
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isEnabled
                  ? isCompliant
                    ? 'bg-[rgba(91,185,140,0.1)]'
                    : 'bg-[rgba(212,83,83,0.1)]'
                  : 'bg-[rgba(255,255,255,0.04)]'
              }`}
            >
              <svg
                className={`w-5 h-5 ${
                  isEnabled
                    ? isCompliant
                      ? 'text-[#5BB98C]'
                      : 'text-[#D45353]'
                    : 'text-[#5F6167]'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-[14px] font-medium text-[#F4F4F5]">
                Compliance Mode
              </h3>
              <p className="text-[12px] text-[#5F6167]">
                {isEnabled
                  ? isCompliant
                    ? 'Wallet verified as compliant'
                    : 'Compliance check failed'
                  : 'Verify wallet for regulatory compliance'}
              </p>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={() => (isEnabled ? disableCompliance() : enableCompliance())}
            disabled={isChecking}
            className={`
              relative w-11 h-6 rounded-full transition-colors duration-200
              ${isEnabled ? 'bg-[#5BB98C]' : 'bg-[#3A3C40]'}
              ${isChecking ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div
              className={`
                absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm
                transition-transform duration-200
                ${isEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'}
              `}
            >
              {isChecking && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 border-2 border-[#5BB98C] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Status */}
        {isEnabled && (
          <div className={`px-5 py-3 ${isCompliant ? 'bg-[rgba(91,185,140,0.04)]' : 'bg-[rgba(212,83,83,0.04)]'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isCompliant ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-[#5BB98C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-[12px] text-[#5BB98C]">Compliant - Low Risk</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-[#D45353]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-[12px] text-[#D45353]">Not Compliant</span>
                  </>
                )}
              </div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-[12px] text-[#5F6167] hover:text-[#F4F4F5] transition-colors"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            </div>
          </div>
        )}

        {/* Details */}
        {isEnabled && showDetails && lastCheck && (
          <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.04)] space-y-4">
            <div className="grid grid-cols-2 gap-4">
                  <div>
                <p className="text-[#5F6167] text-[11px] mb-1">Risk Score</p>
                <p className="text-[#F4F4F5] font-mono text-[14px]">{lastCheck.riskScore}/100</p>
                  </div>
                  <div>
                <p className="text-[#5F6167] text-[11px] mb-1">Risk Level</p>
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        lastCheck.riskLevel === 'low'
                    ? 'bg-[rgba(91,185,140,0.1)] text-[#5BB98C]'
                          : lastCheck.riskLevel === 'medium'
                    ? 'bg-[rgba(212,160,83,0.1)] text-[#D4A053]'
                    : 'bg-[rgba(212,83,83,0.1)] text-[#D45353]'
                }`}>
                      {lastCheck.riskLevel.toUpperCase()}
                    </span>
                  </div>
                  <div>
                <p className="text-[#5F6167] text-[11px] mb-1">Checked At</p>
                <p className="text-[#F4F4F5] text-[12px]">{formatDate(lastCheck.checkedAt)}</p>
                  </div>
                  {proof && (
                    <div>
                  <p className="text-[#5F6167] text-[11px] mb-1">Expires</p>
                  <p className="text-[#F4F4F5] text-[12px]">{formatDate(proof.expiresAt)}</p>
                    </div>
                  )}
                </div>

                {lastCheck.proofHash && (
                  <div>
                <p className="text-[#5F6167] text-[11px] mb-1">Proof Hash</p>
                <p className="text-[#F4F4F5] font-mono text-[11px] break-all bg-[rgba(255,255,255,0.04)] p-2 rounded-lg">
                      {lastCheck.proofHash}
                    </p>
                  </div>
                )}

            <Button variant="ghost" size="sm" onClick={recheckCompliance} disabled={isChecking} fullWidth>
                  {isChecking ? 'Checking...' : 'Recheck Compliance'}
                </Button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-5 py-3 bg-[rgba(212,83,83,0.04)] border-t border-[rgba(212,83,83,0.1)]">
            <p className="text-[12px] text-[#D45353]">{error.message}</p>
          </div>
        )}

        {/* Info */}
        {!isEnabled && (
          <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.04)]">
            <div className="flex gap-3">
              <svg className="w-4 h-4 text-[#5F6167] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <p className="text-[12px] text-[#5F6167] leading-[1.5]">
                Enable compliance mode to verify your wallet is not on any sanctions 
                lists. This helps Sento operate legally while maintaining your privacy.
                Powered by Range Protocol.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ComplianceToggle;
