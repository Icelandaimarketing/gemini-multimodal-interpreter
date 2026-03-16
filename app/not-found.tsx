'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center"
      >
        <AlertCircle size={64} className="text-emerald-500 mb-6" />
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2 italic">404_NOT_FOUND</h1>
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest mb-8">The_requested_coordinate_does_not_exist</p>
        <Link 
          href="/" 
          className="bg-white text-black px-8 py-3 rounded-sm font-mono font-bold uppercase tracking-widest hover:bg-emerald-500 transition-colors"
        >
          Return_to_Base
        </Link>
      </motion.div>
    </div>
  );
}
