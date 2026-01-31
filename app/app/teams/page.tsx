// ============================================
// Sento - Teams Page (Lite)
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { WalletButton } from '@/components/wallet/WalletButton';
import { useActiveTeam, useTeams } from '@/lib/hooks';
import { formatAddress } from '@/lib/utils/format';
import { checkSupabaseTables } from '@/lib/storage/teams';
import type { TeamRole } from '@/types';

export default function TeamsPage() {
  const { connected } = useWallet();
  const { teams, createNewTeam, addMember, removeMember, getMyRole } = useTeams();
  const { activeTeamId, setActiveTeamId } = useActiveTeam();
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [memberInputs, setMemberInputs] = useState<Record<string, { wallet: string; role: TeamRole }>>({});
  const [supabaseStatus, setSupabaseStatus] = useState<{
    configured: boolean;
    tablesExist: boolean;
    error?: string;
  } | null>(null);

  useEffect(() => {
    // Check Supabase status on mount
    checkSupabaseTables().then(setSupabaseStatus);
  }, []);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setCreating(true);
    await createNewTeam(newTeamName.trim());
    setNewTeamName('');
    setCreating(false);
  };

  const handleAddMember = async (teamId: string) => {
    const input = memberInputs[teamId];
    if (!input?.wallet) return;
    await addMember(teamId, input.wallet, input.role);
    setMemberInputs((prev) => ({
      ...prev,
      [teamId]: { wallet: '', role: input.role },
    }));
  };

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pt-16">
        <Card className="max-w-[400px] w-full text-center" padding="lg">
          <CardContent>
            <div className="w-14 h-14 mx-auto mb-6 rounded-xl bg-[rgba(91,185,140,0.08)] flex items-center justify-center">
              <svg className="w-6 h-6 text-[#5BB98C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h2 className="text-[22px] font-medium text-[#F4F4F5] tracking-[-0.01em] mb-2">Connect Wallet</h2>
            <p className="text-[15px] text-[#5F6167] mb-8 leading-[1.5]">Connect your wallet to manage teams</p>
            <WalletButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-[1000px] mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-[24px] font-medium text-[#FAFAFA] tracking-[-0.02em] mb-1">
                Teams
              </h1>
              <p className="text-[13px] text-[#52525B]">
                Collaborate with team members on invoices, payments, and reports
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[rgba(91,185,140,0.08)] border border-[rgba(91,185,140,0.15)] text-[12px] font-medium text-[#5BB98C]">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {teams.length} {teams.length === 1 ? 'Team' : 'Teams'}
            </div>
          </div>

          {/* Storage Status Notice */}
          {supabaseStatus && !supabaseStatus.tablesExist && (
            <div className="mb-6 p-4 rounded-lg bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.15)]">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[#F5A623] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-[#F5A623] mb-1">
                    Using local storage
                  </p>
                  <p className="text-[12px] text-[#A1A1AA] mb-2">
                    Teams are stored in your browser only. To sync across devices, set up Supabase.
                  </p>
                  {supabaseStatus.error && (
                    <p className="text-[11px] text-[#71717A] font-mono mb-2">
                      Error: {supabaseStatus.error}
                    </p>
                  )}
                  <a
                    href="https://github.com/yourusername/sento/blob/main/SUPABASE_SETUP.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#F5A623] hover:text-[#F59E0B] font-medium inline-flex items-center gap-1"
                  >
                    View setup guide
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Create Team */}
        <Card padding="none" className="mb-8">
          <div className="p-5 border-b border-[rgba(255,255,255,0.04)]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(91,185,140,0.08)] border border-[rgba(91,185,140,0.15)] flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#5BB98C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h2 className="text-[16px] font-medium text-[#FAFAFA] mb-0.5">Create New Team</h2>
                <p className="text-[12px] text-[#71717A]">Start collaborating with your team members</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-medium text-[#52525B] uppercase tracking-wider mb-1.5">
                  Team Name
                </label>
                <input
                  placeholder="e.g., Sento Labs, Finance Team"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && newTeamName.trim() && !creating && handleCreateTeam()}
                  className="w-full px-3 py-2 rounded-md bg-[#0D0E10] border border-[rgba(255,255,255,0.06)] text-[13px] text-[#E4E4E7] focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition-colors"
                />
              </div>
              <Button
                onClick={handleCreateTeam}
                disabled={creating || !newTeamName.trim()}
                className="sm:self-end"
                size="md"
              >
                {creating ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </span>
                ) : (
                  'Create Team'
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Teams List */}
        {teams.length === 0 ? (
          <div className="text-center py-16 px-6 rounded-lg border-2 border-dashed border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
              <svg className="w-6 h-6 text-[#52525B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-[14px] font-medium text-[#71717A] mb-1">No teams yet</p>
            <p className="text-[12px] text-[#52525B]">Create your first team to start collaborating</p>
          </div>
        ) : (
          <div className="space-y-5">
            {teams.map((team) => {
              const myRole = getMyRole(team.id);
              const canManage = myRole === 'creator';
              const memberInput = memberInputs[team.id] || { wallet: '', role: 'viewer' };
              const isActive = activeTeamId === team.id;
              return (
                <Card key={team.id} padding="none" className={isActive ? 'ring-1 ring-[rgba(91,185,140,0.3)]' : ''}>
                  <div className="p-5 border-b border-[rgba(255,255,255,0.04)] flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isActive 
                          ? 'bg-[rgba(91,185,140,0.12)] border border-[rgba(91,185,140,0.2)]' 
                          : 'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]'
                      }`}>
                        <svg className={`w-5 h-5 ${isActive ? 'text-[#5BB98C]' : 'text-[#71717A]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[16px] font-medium text-[#FAFAFA] mb-1">{team.name}</h3>
                        <div className="flex items-center gap-3 text-[11px] text-[#71717A]">
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {formatAddress(team.ownerWallet, 6)}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-[#52525B]" />
                          <span>{team.members.length} {team.members.length === 1 ? 'member' : 'members'}</span>
                          <span className="w-1 h-1 rounded-full bg-[#52525B]" />
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
                            myRole === 'creator' 
                              ? 'bg-[rgba(91,185,140,0.08)] text-[#5BB98C]' 
                              : 'bg-[rgba(255,255,255,0.04)] text-[#71717A]'
                          }`}>
                            {myRole}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isActive ? 'primary' : 'secondary'}
                      onClick={() => setActiveTeamId(isActive ? null : team.id)}
                    >
                      {isActive ? (
                        <span className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Active
                        </span>
                      ) : (
                        'Activate'
                      )}
                    </Button>
                  </div>
                  <div className="p-5">
                    {/* Members */}
                    <div className="mb-4">
                      <h4 className="text-[11px] font-medium text-[#52525B] uppercase tracking-wider mb-3">
                        Team Members ({team.members.length})
                      </h4>
                      <div className="space-y-2">
                        {team.members.map((member) => {
                          const isOwner = member.wallet === team.ownerWallet;
                          return (
                            <div key={member.wallet} className="flex items-center justify-between p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)] transition-colors">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  isOwner 
                                    ? 'bg-[rgba(91,185,140,0.08)] border border-[rgba(91,185,140,0.15)]' 
                                    : 'bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]'
                                }`}>
                                  <svg className={`w-4 h-4 ${isOwner ? 'text-[#5BB98C]' : 'text-[#71717A]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-[12px] font-mono text-[#FAFAFA] flex items-center gap-2">
                                    {formatAddress(member.wallet, 6)}
                                    {isOwner && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wide bg-[rgba(91,185,140,0.08)] text-[#5BB98C]">
                                        Owner
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[10px] text-[#52525B] uppercase tracking-wider mt-0.5">
                                    {member.role}
                                  </p>
                                </div>
                              </div>
                              {canManage && !isOwner && (
                                <button
                                  onClick={() => removeMember(team.id, member.wallet)}
                                  className="px-2.5 py-1.5 rounded-md bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] text-[#EF4444] hover:bg-[rgba(239,68,68,0.12)] transition-colors text-[10px] font-medium uppercase tracking-wide"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Add Member */}
                    {canManage && (
                      <div className="pt-4 border-t border-[rgba(255,255,255,0.04)]">
                        <h4 className="text-[11px] font-medium text-[#52525B] uppercase tracking-wider mb-3">
                          Add Member
                        </h4>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1">
                            <label className="block text-[10px] font-medium text-[#52525B] uppercase tracking-wider mb-1.5">
                              Wallet Address
                            </label>
                            <input
                              placeholder="Solana wallet address"
                              value={memberInput.wallet}
                              onChange={(e) =>
                                setMemberInputs((prev) => ({
                                  ...prev,
                                  [team.id]: { ...memberInput, wallet: e.target.value },
                                }))
                              }
                              className="w-full px-3 py-2 rounded-md bg-[#0D0E10] border border-[rgba(255,255,255,0.06)] text-[12px] font-mono text-[#E4E4E7] focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition-colors"
                            />
                          </div>
                          <div className="w-full sm:w-[140px]">
                            <label className="block text-[10px] font-medium text-[#52525B] uppercase tracking-wider mb-1.5">
                              Role
                            </label>
                            <select
                              value={memberInput.role}
                              onChange={(e) =>
                                setMemberInputs((prev) => ({
                                  ...prev,
                                  [team.id]: { ...memberInput, role: e.target.value as TeamRole },
                                }))
                              }
                              className="w-full px-3 py-2 rounded-md bg-[#0D0E10] border border-[rgba(255,255,255,0.06)] text-[12px] text-[#E4E4E7] focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition-colors"
                            >
                              <option value="viewer">Viewer</option>
                              <option value="creator">Creator</option>
                            </select>
                          </div>
                          <Button onClick={() => handleAddMember(team.id)} size="sm" className="sm:self-end">
                            Add Member
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
