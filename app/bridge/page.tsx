'use client';

import dynamic from 'next/dynamic';

const OmniBridge = dynamic(() => import('@/components/OmniBridge'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function BridgePage() {
  return (
    <main className="min-h-screen bg-[#151619]">
      <OmniBridge />
    </main>
  );
}
