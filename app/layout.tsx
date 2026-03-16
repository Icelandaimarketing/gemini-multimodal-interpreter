import './globals.css';
import type { Metadata } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-sans',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Omni-Bridge | Multimodal Interpreter',
  description: 'Breaking communication barriers with Gemini Live API. Real-time Sign Language to spoken language translation.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} scroll-smooth`}>
      <body className="font-sans antialiased bg-[#0A0A0A] text-white selection:bg-emerald-500/30">
        {children}
      </body>
    </html>
  );
}
