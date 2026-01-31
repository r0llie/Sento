// ============================================
// Sento - Site Configuration
// ============================================

export const siteConfig = {
  name: 'Sento',
  description: 'Get paid on Solana without revealing how much you earn.',
  tagline: 'Private Payments for Solana',
  
  // URLs
  url: 'https://sento.app',
  
  // Social
  links: {
    twitter: 'https://twitter.com/sento',
    github: 'https://github.com/sento',
  },
  
  // Features
  features: [
    {
      title: 'Private Invoices',
      description: 'Create invoices without revealing payment amounts on-chain.',
      icon: '🔒',
    },
    {
      title: 'Confidential Payments',
      description: 'Pay invoices using zero-knowledge proofs.',
      icon: '💸',
    },
    {
      title: 'Hidden Balances',
      description: 'Your balance is only visible to you.',
      icon: '👁️',
    },
    {
      title: 'Compliance Ready',
      description: 'Prove compliance without revealing amounts.',
      icon: '✅',
    },
  ],
  
  // Network config
  network: {
    name: 'devnet',
    displayName: 'Solana Devnet',
  },
} as const;

export type SiteConfig = typeof siteConfig;
