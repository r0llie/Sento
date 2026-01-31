// ============================================
// Sento - Active Team Hook
// ============================================

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

const ACTIVE_TEAM_KEY = 'sento_active_team';
const ACTIVE_TEAM_EVENT = 'sento_active_team_change';

interface ActiveTeamState {
  activeTeamId: string | null;
  setActiveTeamId: (teamId: string | null) => void;
}

function readActiveTeam(walletAddress: string): string | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(ACTIVE_TEAM_KEY);
  if (!stored) return null;
  try {
    const map: Record<string, string | null> = JSON.parse(stored);
    return map[walletAddress] ?? null;
  } catch (error) {
    console.warn('Failed to read active team:', error);
    return null;
  }
}

function writeActiveTeam(walletAddress: string, teamId: string | null): void {
  if (typeof window === 'undefined') return;
  const stored = localStorage.getItem(ACTIVE_TEAM_KEY);
  const map: Record<string, string | null> = stored ? JSON.parse(stored) : {};
  map[walletAddress] = teamId;
  localStorage.setItem(ACTIVE_TEAM_KEY, JSON.stringify(map));
}

export function useActiveTeam(): ActiveTeamState {
  const { publicKey } = useWallet();
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setActiveTeamIdState(null);
      return;
    }
    const walletAddress = publicKey.toBase58();
    setActiveTeamIdState(readActiveTeam(walletAddress));
  }, [publicKey]);

  useEffect(() => {
    if (!publicKey) return;
    const walletAddress = publicKey.toBase58();

    const handleUpdate = (event: Event) => {
      const custom = event as CustomEvent<{ wallet: string }>;
      if (custom.detail?.wallet === walletAddress) {
        setActiveTeamIdState(readActiveTeam(walletAddress));
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === ACTIVE_TEAM_KEY) {
        setActiveTeamIdState(readActiveTeam(walletAddress));
      }
    };

    window.addEventListener(ACTIVE_TEAM_EVENT, handleUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(ACTIVE_TEAM_EVENT, handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [publicKey]);

  const setActiveTeamId = useCallback(
    (teamId: string | null) => {
      if (!publicKey) return;
      const walletAddress = publicKey.toBase58();
      writeActiveTeam(walletAddress, teamId);
      setActiveTeamIdState(teamId);
      window.dispatchEvent(
        new CustomEvent(ACTIVE_TEAM_EVENT, { detail: { wallet: walletAddress } })
      );
    },
    [publicKey]
  );

  return { activeTeamId, setActiveTeamId };
}

export default useActiveTeam;
