// ============================================
// Sento - Wallet Dropdown
// Premium, banking-quality UI
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { formatAddress, formatLamportsToSol } from '@/lib/utils/format';
import { getCompressedBalance, checkLightProtocolHealth } from '@/lib/solana/light-protocol';

export function WalletDropdown() {
  const { connected, publicKey, disconnect, connecting, wallet } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  
  const [isOpen, setIsOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [privateBalance, setPrivateBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    async function fetchBalances() {
      if (!publicKey || !connected) {
        setWalletBalance(0);
        setPrivateBalance(0);
        return;
      }

      setIsLoadingBalance(true);
      try {
        const balance = await connection.getBalance(publicKey);
        setWalletBalance(balance);

        const health = await checkLightProtocolHealth();
        if (health.indexer) {
          const compressed = await getCompressedBalance(publicKey);
          setPrivateBalance(Number(compressed));
        }
      } catch (err) {
        console.error('Failed to fetch balances:', err);
      } finally {
        setIsLoadingBalance(false);
      }
    }

    fetchBalances();
    const interval = setInterval(fetchBalances, 15000);
    return () => clearInterval(interval);
  }, [publicKey, connected, connection]);

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = async () => {
    setIsOpen(false);
    await disconnect();
  };

  if (!connected || !publicKey) {
    return (
      <button
        onClick={() => setVisible(true)}
        disabled={connecting}
        className="flex items-center gap-2 h-9 px-5 rounded-md bg-[#5ED9B3] text-[#09090B] text-[13px] font-semibold hover:bg-[#6FE9C3] transition-colors disabled:opacity-50"
      >
        {connecting ? (
          <>
            <div className="w-4 h-4 border-2 border-[#0A0B0C]/30 border-t-[#0A0B0C] rounded-full animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Connect</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 h-9 px-3 rounded-md bg-[#111113] border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.08)] transition-colors"
      >
          {wallet?.adapter.icon ? (
          <img src={wallet.adapter.icon} alt={wallet.adapter.name} className="w-5 h-5 rounded" />
          ) : (
          <img src="/slogotp.png" alt="Sento" className="w-6 h-6" />
          )}

        <div className="text-left hidden sm:block">
          <div className="text-[12px] font-medium text-[#FAFAFA] font-mono">
            {isLoadingBalance ? '...' : formatLamportsToSol(walletBalance)}
            <span className="text-[#52525B] font-sans text-[10px] ml-1">SOL</span>
          </div>
        </div>

        <svg 
          className={`w-3.5 h-3.5 text-[#52525B] transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

        {isOpen && (
        <div className="absolute right-0 mt-1.5 w-64 rounded-lg bg-[#18181B] border border-[rgba(255,255,255,0.06)] shadow-[0_4px_16px_rgba(0,0,0,0.6)] overflow-hidden z-50">
            {/* Balance Section */}
          <div className="p-3 border-b border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[#52525B] uppercase tracking-[0.06em] font-medium">Balance</span>
                <button 
                  onClick={() => { setIsLoadingBalance(true); setTimeout(() => setIsLoadingBalance(false), 500); }}
                className="text-[#52525B] hover:text-[#71717A] p-1 rounded transition-colors"
                >
                <svg className={`w-3 h-3 ${isLoadingBalance ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              
            <div className="space-y-1.5">
              <div className="flex items-center justify-between p-2.5 rounded-md bg-[#111113]">
                  <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
                    <svg className="w-2 h-2 text-[#52525B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                  </div>
                  <span className="text-[#52525B] text-[11px]">Public</span>
                </div>
                <span className="text-[#71717A] text-[12px] font-medium font-mono">{formatLamportsToSol(walletBalance)}</span>
                </div>

              <div className="flex items-center justify-between p-2.5 rounded-md bg-[#0F1412] border border-[rgba(94,217,179,0.1)]">
                  <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[rgba(94,217,179,0.1)] flex items-center justify-center">
                    <svg className="w-2 h-2 text-[#5ED9B3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                  </div>
                  <span className="text-[#5ED9B3] text-[11px]">Private</span>
                </div>
                <span className="text-[#5ED9B3] text-[12px] font-medium font-mono">{formatLamportsToSol(privateBalance)}</span>
                </div>
              </div>
            </div>

            {/* Address */}
          <div className="px-3 py-2 border-b border-[rgba(255,255,255,0.05)]">
              <div className="flex items-center justify-between">
              <span className="text-[#71717A] text-[11px] font-mono">{formatAddress(publicKey.toBase58(), 8)}</span>
              <button onClick={copyAddress} className="text-[10px] text-[#52525B] hover:text-[#71717A] transition-colors">
                {copied ? '✓' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Actions */}
          <div className="p-1.5">
              {[
              { href: '/balance', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', label: 'Balance' },
              { href: '/invoice/create', icon: 'M12 4v16m8-8H4', label: 'New Invoice' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-[#71717A] hover:bg-[rgba(255,255,255,0.03)] hover:text-[#FAFAFA] transition-colors"
                >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                <span className="text-[12px]">{item.label}</span>
                </Link>
              ))}

              <button
                onClick={() => setVisible(true)}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-[#71717A] hover:bg-[rgba(255,255,255,0.03)] hover:text-[#FAFAFA] transition-colors"
              >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              <span className="text-[12px]">Change</span>
              </button>

              <button
                onClick={handleDisconnect}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors"
              >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              <span className="text-[12px]">Disconnect</span>
              </button>
            </div>
        </div>
        )}
    </div>
  );
}

export default WalletDropdown;
