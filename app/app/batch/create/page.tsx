// ============================================
// Sento - Batch Payment Page (Redirect)
// Redirects to /payments tab
// ============================================

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BatchPaymentCreatePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/payments');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#5ED9B3] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[13px] text-[#52525B]">Redirecting to Payments...</p>
      </div>
    </div>
  );
}
