// ============================================
// Sento - Premium Header
// Clean, minimal, professional
// ============================================

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletDropdown } from '@/components/wallet/WalletDropdown';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { useActiveTeam, useTeams } from '@/lib/hooks';

const navigation = [
  { name: 'Home', href: '/', authRequired: false },
  { name: 'Learn', href: '/learn', authRequired: false },
  { name: 'Balance', href: '/balance', authRequired: true },
  { name: 'Payments', href: '/payments', authRequired: true },
];

export function Header() {
  const pathname = usePathname();
  const { connected } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [teamMenuOpen, setTeamMenuOpen] = useState(false);
  const { teams } = useTeams();
  const { activeTeamId, setActiveTeamId } = useActiveTeam();
  const activeTeam = useMemo(
    () => teams.find((team) => team.id === activeTeamId),
    [teams, activeTeamId]
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Background - less blur, more sharp */}
      <div className="absolute inset-0 bg-[#09090B]/95 border-b border-[rgba(255,255,255,0.04)]" />
      
      <div className="relative max-w-[1100px] mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <img 
              src="/slogotp.png" 
              alt="Sento" 
              className="h-8 w-auto"
            />
            <span className="text-[14px] font-medium text-[#FAFAFA]">
              Sento
            </span>
          </Link>

          {/* Desktop Navigation - LEVEL C (muted) */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              if (item.authRequired && !connected) return null;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    px-3 py-1.5 rounded-[5px] text-[12px] font-medium transition-colors
                    ${isActive 
                      ? 'text-[#FAFAFA] bg-[rgba(255,255,255,0.04)]' 
                      : 'text-[#52525B] hover:text-[#71717A]'
                    }
                  `}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-1.5">
            {/* Team Switcher */}
            {connected && (
              <div className="relative">
                <button
                  onClick={() => setTeamMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-[11px] font-medium text-[#A1A1AA] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:text-[#E4E4E7] transition-colors"
                >
                  <span>{activeTeam ? `Team: ${activeTeam.name}` : 'Personal'}</span>
                  <svg className="w-3 h-3 text-[#71717A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {teamMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#0D0E10] shadow-xl z-50">
                    <button
                      onClick={() => {
                        setActiveTeamId(null);
                        setTeamMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-[12px] ${
                        activeTeamId === null ? 'text-[#FAFAFA] bg-[rgba(255,255,255,0.04)]' : 'text-[#71717A] hover:text-[#FAFAFA]'
                      }`}
                    >
                      Personal
                    </button>
                    {teams.length > 0 && (
                      <div className="py-1 border-t border-[rgba(255,255,255,0.04)]">
                        {teams.map((team) => (
                          <button
                            key={team.id}
                            onClick={() => {
                              setActiveTeamId(team.id);
                              setTeamMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-[12px] ${
                              activeTeamId === team.id ? 'text-[#FAFAFA] bg-[rgba(255,255,255,0.04)]' : 'text-[#71717A] hover:text-[#FAFAFA]'
                            }`}
                          >
                            Team: {team.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="border-t border-[rgba(255,255,255,0.04)]">
                      <Link
                        href="/teams"
                        onClick={() => setTeamMenuOpen(false)}
                        className="block px-3 py-2 text-[12px] text-[#71717A] hover:text-[#FAFAFA]"
                      >
                        Manage teams
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
            <NotificationBell />
            <WalletDropdown />

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-[5px] text-[#52525B] hover:text-[#71717A] transition-colors"
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
        {mobileMenuOpen && (
        <div className="md:hidden relative bg-[#09090B] border-t border-[rgba(255,255,255,0.04)]">
          <div className="p-3 space-y-0.5">
              {navigation.map((item) => {
                if (item.authRequired && !connected) return null;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                    block px-3 py-2.5 rounded-[5px] text-[13px] font-medium transition-colors
                      ${isActive 
                      ? 'bg-[rgba(255,255,255,0.04)] text-[#FAFAFA]' 
                      : 'text-[#52525B] hover:text-[#71717A]'
                      }
                    `}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
        </div>
        )}
    </header>
  );
}

export default Header;
