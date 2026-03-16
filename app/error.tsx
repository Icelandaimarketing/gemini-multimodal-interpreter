'use client';

import { useEffect } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center"
      >
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2 italic">System_Failure</h1>
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest mb-8 max-w-md">
          {error.message || 'An unexpected error occurred in the translation matrix.'}
        </p>
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-sm font-mono font-bold uppercase tracking-widest hover:bg-emerald-500 transition-colors"
        >
          <RefreshCcw size={16} />
          Reboot_System
        </button>
      </motion.div>
    </div>
  );
}
