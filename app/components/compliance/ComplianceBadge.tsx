// ============================================
// Sento - Compliance Badge
// Lives on Private Balance Card
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { useCompliance } from '@/lib/hooks/useCompliance';

type BadgeState = 'available' | 'verified' | 'required';

export function ComplianceBadge() {
  const { isEnabled, isCompliant, isChecking } = useCompliance();
  const [showPopover, setShowPopover] = useState(false);
  const badgeRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Determine badge state
  const badgeState: BadgeState = isEnabled
    ? isCompliant === true
      ? 'verified'
      : isCompliant === false
      ? 'required'
      : 'available'
    : 'available';

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        badgeRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !badgeRef.current.contains(event.target as Node)
      ) {
        setShowPopover(false);
      }
    }

    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPopover]);

  const badgeConfig = {
    available: {
      bg: 'bg-[rgba(255,255,255,0.06)]',
      border: 'border-[rgba(255,255,255,0.1)]',
      icon: (
        <svg className="w-3 h-3 text-[#71717A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
      text: 'Compliance available',
    },
    verified: {
      bg: 'bg-[rgba(94,217,179,0.12)]',
      border: 'border-[rgba(94,217,179,0.2)]',
      icon: (
        <svg className="w-3 h-3 text-[#5ED9B3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
      text: 'Compliance verified',
    },
    required: {
      bg: 'bg-[rgba(239,68,68,0.12)]',
      border: 'border-[rgba(239,68,68,0.2)]',
      icon: (
        <svg className="w-3 h-3 text-[#EF4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
      text: 'Compliance required',
    },
  };

  const config = badgeConfig[badgeState];

  return (
    <div className="relative">
      <button
        ref={badgeRef}
        onClick={() => setShowPopover(!showPopover)}
        onMouseEnter={() => setShowPopover(true)}
        className={`
          flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all
          ${config.bg} ${config.border}
          hover:opacity-80
        `}
      >
        {config.icon}
        <span className="text-[10px] font-medium uppercase tracking-[0.05em] text-[#71717A]">
          {badgeState === 'available' ? 'Compliance' : badgeState === 'verified' ? 'Verified' : 'Required'}
        </span>
        {isChecking && (
          <div className="w-2.5 h-2.5 border border-[#5ED9B3] border-t-transparent rounded-full animate-spin" />
        )}
      </button>

      {/* Popover */}
      {showPopover && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 mt-2 w-[280px] z-50"
          onMouseLeave={() => setShowPopover(false)}
        >
          <div className="bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-lg shadow-xl p-4 space-y-3">
            {/* Status */}
            <div className="flex items-center gap-2">
              {config.icon}
              <div>
                <p className="text-[12px] font-medium text-[#FAFAFA]">{config.text}</p>
                {badgeState === 'verified' && (
                  <p className="text-[11px] text-[#52525B] mt-0.5">
                    This wallet has generated a zero-knowledge compliance proof.
                  </p>
                )}
              </div>
            </div>

            {/* ZK Message */}
            {badgeState === 'verified' && (
              <div className="pt-2 border-t border-[rgba(255,255,255,0.05)]">
                <p className="text-[11px] text-[#52525B] leading-[1.5]">
                  No identity or transaction history is revealed.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 border-t border-[rgba(255,255,255,0.05)]">
              <button
                onClick={() => {
                  setShowPopover(false);
                  // Scroll to settings section
                  const settingsEl = document.getElementById('compliance-settings');
                  if (settingsEl) {
                    settingsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="text-[11px] font-medium text-[#5ED9B3] hover:text-[#6FE9C3] transition-colors"
              >
                Manage compliance →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
