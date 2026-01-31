// ============================================
// Sento - Wallet Button
// ============================================

'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { formatAddress } from '@/lib/utils/format';

interface WalletButtonProps {
  className?: string;
}

export function WalletButton({ className = '' }: WalletButtonProps) {
  return (
    <div className={className}>
      <WalletMultiButton
        style={{
          background: '#5ED9B3',
          color: '#09090B',
          borderRadius: '8px',
          padding: '12px 24px',
          fontSize: '14px',
          fontWeight: 600,
          height: '46px',
          border: 'none',
          boxShadow: 'none',
        }}
      />
    </div>
  );
}

export function WalletStatus() {
  const { connected, publicKey, connecting, disconnecting } = useWallet();

  if (connecting) {
    return (
      <div className="flex items-center gap-2 text-[#71717A]">
        <div className="w-1.5 h-1.5 bg-[#F5A623] rounded-full animate-pulse" />
        <span className="text-[13px]">Connecting...</span>
      </div>
    );
  }

  if (disconnecting) {
    return (
      <div className="flex items-center gap-2 text-[#71717A]">
        <div className="w-1.5 h-1.5 bg-[#EF4444] rounded-full animate-pulse" />
        <span className="text-[13px]">Disconnecting...</span>
      </div>
    );
  }

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-[#5ED9B3] rounded-full" />
        <span className="text-[13px] text-[#71717A]">
          {formatAddress(publicKey.toBase58())}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-[#52525B]">
      <div className="w-1.5 h-1.5 bg-[#3F3F46] rounded-full" />
      <span className="text-[13px]">Not connected</span>
    </div>
  );
}

export default WalletButton;
