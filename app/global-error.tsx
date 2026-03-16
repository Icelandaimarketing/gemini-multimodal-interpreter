'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-black text-white flex flex-col items-center justify-center min-h-screen font-sans">
        <div className="p-8 border border-white/10 rounded-sm bg-zinc-900 text-center max-w-md">
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-4 italic text-red-500">Critical_System_Error</h2>
          <p className="text-zinc-400 text-sm mb-8 font-mono uppercase tracking-widest">
            {error.message || 'An unrecoverable error occurred in the translation matrix.'}
          </p>
          <button
            onClick={() => reset()}
            className="bg-white text-black px-8 py-3 rounded-sm font-bold uppercase tracking-widest hover:bg-emerald-500 transition-colors"
          >
            Attempt_Recovery
          </button>
        </div>
      </body>
    </html>
  );
}
