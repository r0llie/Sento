// ============================================
// Sento - Teams Hook
// ============================================

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { createTeam, getTeamsForWallet, addTeamMember, removeTeamMember } from '../storage/teams';
import { generateTeamId } from '../utils/format';
import type { Team, TeamMember, TeamRole } from '@/types';

interface UseTeamsReturn {
  teams: Team[];
  isLoading: boolean;
  error: Error | null;
  createNewTeam: (name: string) => Promise<Team | null>;
  addMember: (teamId: string, wallet: string, role: TeamRole) => Promise<void>;
  removeMember: (teamId: string, wallet: string) => Promise<void>;
  getTeamById: (teamId: string | null) => Team | undefined;
  getMyRole: (teamId: string | null) => TeamRole | null;
  refresh: () => Promise<void>;
}

export function useTeams(): UseTeamsReturn {
  const { publicKey } = useWallet();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTeams = useCallback(async () => {
    if (!publicKey) {
      setTeams([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const walletAddress = publicKey.toBase58();
      const loaded = await getTeamsForWallet(walletAddress);
      setTeams(loaded);
    } catch (err) {
      console.error('Failed to load teams:', err);
      setError(err instanceof Error ? err : new Error('Failed to load teams'));
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const createNewTeam = useCallback(
    async (name: string): Promise<Team | null> => {
      if (!publicKey) return null;
      const trimmed = name.trim();
      if (!trimmed) return null;

      const ownerWallet = publicKey.toBase58();
      const team: Team = {
        id: generateTeamId(),
        name: trimmed,
        ownerWallet,
        createdAt: new Date(),
        members: [
          {
            wallet: ownerWallet,
            role: 'creator',
            addedAt: new Date(),
          },
        ],
      };

      const saved = await createTeam(team);
      setTeams((prev) => [saved, ...prev]);
      return saved;
    },
    [publicKey]
  );

  const addMember = useCallback(
    async (teamId: string, wallet: string, role: TeamRole) => {
      const trimmed = wallet.trim();
      if (!trimmed) return;

      const member: TeamMember = {
        wallet: trimmed,
        role,
        addedAt: new Date(),
      };

      await addTeamMember(teamId, member);
      setTeams((prev) =>
        prev.map((team) =>
          team.id === teamId
            ? { ...team, members: [...team.members.filter((m) => m.wallet !== trimmed), member] }
            : team
        )
      );
    },
    []
  );

  const removeMember = useCallback(async (teamId: string, wallet: string) => {
    await removeTeamMember(teamId, wallet);
    setTeams((prev) =>
      prev.map((team) =>
        team.id === teamId
          ? { ...team, members: team.members.filter((m) => m.wallet !== wallet) }
          : team
      )
    );
  }, []);

  const getTeamById = useCallback(
    (teamId: string | null) => teams.find((team) => team.id === teamId),
    [teams]
  );

  const getMyRole = useCallback(
    (teamId: string | null): TeamRole | null => {
      if (!publicKey || !teamId) return null;
      const wallet = publicKey.toBase58();
      const team = teams.find((t) => t.id === teamId);
      if (!team) return null;
      if (team.ownerWallet === wallet) return 'creator';
      const member = team.members.find((m) => m.wallet === wallet);
      return member?.role ?? null;
    },
    [publicKey, teams]
  );

  return useMemo(
    () => ({
      teams,
      isLoading,
      error,
      createNewTeam,
      addMember,
      removeMember,
      getTeamById,
      getMyRole,
      refresh: loadTeams,
    }),
    [teams, isLoading, error, createNewTeam, addMember, removeMember, getTeamById, getMyRole, loadTeams]
  );
}

export default useTeams;
