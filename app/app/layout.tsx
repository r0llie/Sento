// ============================================
// Sento - Premium Root Layout
// Clean, professional design system
// ============================================

import type { Metadata } from 'next';
import { Providers } from './providers';
import { Header } from '@/components/layout/Header';
import { siteConfig } from '@/config/site';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} - ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    'Solana',
    'Privacy',
    'Payments',
    'ZK Compression',
    'Light Protocol',
    'Crypto',
    'Invoice',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.cdnfonts.com" crossOrigin="anonymous" />
        <link href="https://fonts.cdnfonts.com/css/geist" rel="stylesheet" />
        <link href="https://fonts.cdnfonts.com/css/geist-mono" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-[#09090B] text-white antialiased">
        <Providers>
          <div className="relative flex flex-col min-h-screen">
            <Header />
            <main className="flex-1">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
