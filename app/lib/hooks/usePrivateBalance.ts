// ============================================
// Sento - Private Balance Hook
// Fetches compressed SOL balance via Light Protocol
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { getCompressedBalance, checkLightProtocolHealth } from '../solana/light-protocol';

interface UsePrivateBalanceReturn {
  privateBalance: number;
  walletBalance: number;
  isLoading: boolean;
  error: string | null;
  isLightProtocolAvailable: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and manage private (compressed) and wallet balances
 */
export function usePrivateBalance(): UsePrivateBalanceReturn {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  
  const [privateBalance, setPrivateBalance] = useState<number>(0);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLightProtocolAvailable, setIsLightProtocolAvailable] = useState(false);

  const fetchBalances = useCallback(async () => {
    if (!publicKey || !connected) {
      setPrivateBalance(0);
      setWalletBalance(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch regular wallet balance
      const balance = await connection.getBalance(publicKey);
      setWalletBalance(balance);

      // Check Light Protocol health
      const health = await checkLightProtocolHealth();
      setIsLightProtocolAvailable(health.indexer);

      if (health.indexer) {
        // Fetch compressed SOL balance
        const compressedBalance = await getCompressedBalance(publicKey);
        setPrivateBalance(Number(compressedBalance));
      } else {
        setPrivateBalance(0);
        console.log('Light Protocol indexer not available');
      }
    } catch (err) {
      console.error('Failed to fetch balances:', err);
      setError('Failed to fetch balances');
      setPrivateBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connected, connection]);

  useEffect(() => {
    fetchBalances();

    // Poll for balance updates every 10 seconds
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  return {
    privateBalance,
    walletBalance,
    isLoading,
    error,
    isLightProtocolAvailable,
    refresh: fetchBalances,
  };
}

export default usePrivateBalance;
