// ============================================
// Sento - Client Providers
// ============================================

'use client';

import { ReactNode } from 'react';
import { WalletProvider } from '@/components/wallet/WalletProvider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <WalletProvider>
      {children}
    </WalletProvider>
  );
}

export default Providers;
