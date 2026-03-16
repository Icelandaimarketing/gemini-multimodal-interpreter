/* eslint-disable @next/next/no-page-custom-font */
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Omni-Bridge | Multimodal Interpreter',
  description: 'Breaking communication barriers with Gemini Live API. Real-time Sign Language to spoken language translation.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Space+Grotesk:wght@300..700&family=JetBrains+Mono:wght@100..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-[#0A0A0A] text-white selection:bg-emerald-500/30">
        {children}
      </body>
    </html>
  );
}
