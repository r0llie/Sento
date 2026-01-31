// ============================================
// Sento - Teams Storage (Supabase + localStorage)
// ============================================

import type { Team, TeamMember, TeamRole } from '@/types';
import { validateTeamId, validateWalletAddress } from '../utils/validation';

// Environment configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const USE_SUPABASE = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// LocalStorage key
const LOCAL_STORAGE_KEY = 'sento_teams';

// Supabase client (lazy)
import type { SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';

let supabaseClient: SupabaseClientType | null = null;

async function getSupabaseClient(): Promise<SupabaseClientType | null> {
  if (!USE_SUPABASE) return null;
  if (supabaseClient) return supabaseClient;

  try {
    const { createClient } = await import('@supabase/supabase-js');
    supabaseClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    return supabaseClient;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null;
  }
}

/**
 * Supabase schema:
 * 
 * CREATE TABLE teams (
 *   id TEXT PRIMARY KEY,
 *   name TEXT NOT NULL,
 *   owner_wallet TEXT NOT NULL,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 * 
 * CREATE TABLE team_members (
 *   team_id TEXT NOT NULL,
 *   wallet TEXT NOT NULL,
 *   role TEXT NOT NULL,
 *   added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 */

interface TeamDB {
  id: string;
  name: string;
  owner_wallet: string;
  created_at: string;
}

interface TeamMemberDB {
  team_id: string;
  wallet: string;
  role: TeamRole;
  added_at?: string;
}

function toTeam(team: TeamDB, members: TeamMemberDB[]): Team {
  return {
    id: team.id,
    name: team.name,
    ownerWallet: team.owner_wallet,
    createdAt: new Date(team.created_at),
    members: members.map((member) => ({
      wallet: member.wallet,
      role: member.role,
      addedAt: member.added_at ? new Date(member.added_at) : new Date(),
    })),
  };
}

function serializeTeam(team: Team): Team {
  return {
    ...team,
    createdAt: team.createdAt instanceof Date ? team.createdAt : new Date(team.createdAt),
    members: team.members.map((member) => ({
      ...member,
      addedAt: member.addedAt instanceof Date ? member.addedAt : new Date(member.addedAt),
    })),
  };
}

function isValidRole(role: string): role is TeamRole {
  return role === 'viewer' || role === 'creator';
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if Supabase is configured and available
 */
export function isSupabaseConfigured(): boolean {
  return USE_SUPABASE;
}

/**
 * Check if Supabase tables exist (async check)
 */
export async function checkSupabaseTables(): Promise<{
  configured: boolean;
  tablesExist: boolean;
  error?: string;
}> {
  if (!USE_SUPABASE) {
    return { configured: false, tablesExist: false };
  }

  try {
    const client = await getSupabaseClient();
    if (!client) {
      return { configured: false, tablesExist: false };
    }

    // Try to query teams table (lightweight check)
    const { error } = await client.from('teams').select('id').limit(0);
    
    if (error) {
      return {
        configured: true,
        tablesExist: false,
        error: error.message || 'Tables not found',
      };
    }

    return { configured: true, tablesExist: true };
  } catch (err: any) {
    return {
      configured: true,
      tablesExist: false,
      error: err?.message || 'Unknown error',
    };
  }
}

// ============================================
// Public API
// ============================================

export async function getTeamsForWallet(walletAddress: string): Promise<Team[]> {
  const client = await getSupabaseClient();
  if (client) {
    return getTeamsFromSupabase(client, walletAddress);
  }

  return getTeamsFromLocalStorage(walletAddress);
}

export async function createTeam(team: Team): Promise<Team> {
  const client = await getSupabaseClient();
  if (client) {
    return createTeamInSupabase(client, team);
  }

  return saveTeamToLocalStorage(team);
}

export async function addTeamMember(teamId: string, member: TeamMember): Promise<void> {
  const client = await getSupabaseClient();
  if (client) {
    await addTeamMemberInSupabase(client, teamId, member);
    return;
  }

  addTeamMemberInLocalStorage(teamId, member);
}

export async function removeTeamMember(teamId: string, wallet: string): Promise<void> {
  const client = await getSupabaseClient();
  if (client) {
    await removeTeamMemberInSupabase(client, teamId, wallet);
    return;
  }

  removeTeamMemberInLocalStorage(teamId, wallet);
}

// ============================================
// Supabase operations
// ============================================

async function getTeamsFromSupabase(
  client: SupabaseClientType,
  walletAddress: string
): Promise<Team[]> {
  try {
    const walletValidation = validateWalletAddress(walletAddress);
    if (!walletValidation.valid) return getTeamsFromLocalStorage(walletAddress);
    const sanitizedWallet = walletValidation.sanitized!;

    const { data: memberTeams } = await client
      .from('team_members')
      .select('team_id')
      .eq('wallet', sanitizedWallet);

    const memberTeamIds = (memberTeams || []).map((row) => row.team_id);

    const { data: ownerTeams } = await client
      .from('teams')
      .select('*')
      .eq('owner_wallet', sanitizedWallet);

    const ownerTeamIds = (ownerTeams || []).map((row) => row.id);
    const allTeamIds = Array.from(new Set([...memberTeamIds, ...ownerTeamIds]));

    if (allTeamIds.length === 0) return [];

    const { data: teamsData } = await client
      .from('teams')
      .select('*')
      .in('id', allTeamIds);

    const { data: membersData } = await client
      .from('team_members')
      .select('*')
      .in('team_id', allTeamIds);

    const membersByTeam = new Map<string, TeamMemberDB[]>();
    (membersData || []).forEach((member) => {
      if (!membersByTeam.has(member.team_id)) {
        membersByTeam.set(member.team_id, []);
      }
      membersByTeam.get(member.team_id)!.push(member);
    });

    return (teamsData || [])
      .map((team) => toTeam(team as TeamDB, membersByTeam.get(team.id) || []))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error: any) {
    console.error('Failed to load teams from Supabase:', {
      error,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
    });
    console.warn('Falling back to localStorage for teams');
    return getTeamsFromLocalStorage(walletAddress);
  }
}

async function createTeamInSupabase(
  client: SupabaseClientType,
  team: Team
): Promise<Team> {
  const idValidation = validateTeamId(team.id);
  const ownerValidation = validateWalletAddress(team.ownerWallet);
  if (!idValidation.valid || !ownerValidation.valid) {
    return saveTeamToLocalStorage(team);
  }

  const teamPayload: TeamDB = {
    id: idValidation.sanitized!,
    name: team.name.trim(),
    owner_wallet: ownerValidation.sanitized!,
    created_at: team.createdAt.toISOString(),
  };

  const { error } = await client.from('teams').insert(teamPayload);
  if (error) {
    console.error('Supabase teams insert error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    console.warn('Falling back to localStorage for team storage');
    return saveTeamToLocalStorage(team);
  }

  const ownerMember: TeamMemberDB = {
    team_id: teamPayload.id,
    wallet: ownerValidation.sanitized!,
    role: 'creator',
    added_at: team.createdAt.toISOString(),
  };

  await client.from('team_members').insert(ownerMember);

  // Also store in localStorage for offline access
  saveTeamToLocalStorage({
    ...team,
    id: teamPayload.id,
    ownerWallet: ownerValidation.sanitized!,
  });

  return team;
}

async function addTeamMemberInSupabase(
  client: SupabaseClientType,
  teamId: string,
  member: TeamMember
): Promise<void> {
  const idValidation = validateTeamId(teamId);
  const walletValidation = validateWalletAddress(member.wallet);
  if (!idValidation.valid || !walletValidation.valid || !isValidRole(member.role)) {
    addTeamMemberInLocalStorage(teamId, member);
    return;
  }

  const payload: TeamMemberDB = {
    team_id: idValidation.sanitized!,
    wallet: walletValidation.sanitized!,
    role: member.role,
    added_at: member.addedAt.toISOString(),
  };

  const { error } = await client.from('team_members').insert(payload);
  if (error) {
    console.error('Supabase team_members insert error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    console.warn('Falling back to localStorage for member storage');
    addTeamMemberInLocalStorage(teamId, member);
    return;
  }

  addTeamMemberInLocalStorage(teamId, member);
}

async function removeTeamMemberInSupabase(
  client: SupabaseClientType,
  teamId: string,
  wallet: string
): Promise<void> {
  const idValidation = validateTeamId(teamId);
  const walletValidation = validateWalletAddress(wallet);
  if (!idValidation.valid || !walletValidation.valid) {
    removeTeamMemberInLocalStorage(teamId, wallet);
    return;
  }

  const { error } = await client
    .from('team_members')
    .delete()
    .eq('team_id', idValidation.sanitized!)
    .eq('wallet', walletValidation.sanitized!);

  if (error) {
    console.error('Supabase remove member error:', error);
  }

  removeTeamMemberInLocalStorage(teamId, wallet);
}

// ============================================
// localStorage operations
// ============================================

function getTeamsFromLocalStorage(walletAddress: string): Team[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) return [];

  try {
    const teams = JSON.parse(stored) as Team[];
    return teams
      .map(serializeTeam)
      .filter((team) =>
        team.ownerWallet === walletAddress ||
        team.members.some((member) => member.wallet === walletAddress)
      );
  } catch (error) {
    console.error('Failed to parse teams from localStorage:', error);
    return [];
  }
}

function saveTeamToLocalStorage(team: Team): Team {
  if (typeof window === 'undefined') return team;

  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  const teams: Team[] = stored ? JSON.parse(stored) : [];
  const nextTeams = teams.filter((t) => t.id !== team.id);
  nextTeams.push(team);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextTeams));

  return team;
}

function addTeamMemberInLocalStorage(teamId: string, member: TeamMember): void {
  if (typeof window === 'undefined') return;

  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  const teams: Team[] = stored ? JSON.parse(stored) : [];
  const nextTeams = teams.map((team) => {
    if (team.id !== teamId) return team;
    const existing = team.members.find((m) => m.wallet === member.wallet);
    if (existing) {
      return {
        ...team,
        members: team.members.map((m) => (m.wallet === member.wallet ? member : m)),
      };
    }
    return {
      ...team,
      members: [...team.members, member],
    };
  });
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextTeams));
}

function removeTeamMemberInLocalStorage(teamId: string, wallet: string): void {
  if (typeof window === 'undefined') return;

  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  const teams: Team[] = stored ? JSON.parse(stored) : [];
  const nextTeams = teams.map((team) => {
    if (team.id !== teamId) return team;
    return {
      ...team,
      members: team.members.filter((member) => member.wallet !== wallet),
    };
  });
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextTeams));
}
