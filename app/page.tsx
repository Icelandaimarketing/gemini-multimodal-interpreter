'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { 
  Video, 
  ArrowRight, 
  Zap, 
  Globe, 
  Shield, 
  Cpu, 
  Languages,
  Command,
  Plus
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-emerald-500 selection:text-black overflow-x-hidden font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-sm flex items-center justify-center">
              <Video className="text-black w-5 h-5" />
            </div>
            <span className="font-display font-black text-xl tracking-tighter uppercase italic">Omni-Bridge</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500">
            <a href="#technology" className="hover:text-white transition-colors">Technology</a>
            <a href="#impact" className="hover:text-white transition-colors">Impact</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
          </div>
          <Link 
            href="/bridge"
            className="bg-white text-black px-6 py-2.5 rounded-sm font-bold text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all"
          >
            Launch_Bridge
          </Link>
        </div>
      </nav>

      {/* Hero Section - Editorial Style */}
      <section className="relative pt-48 pb-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
            <div className="lg:col-span-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-widest mb-8">
                  <Zap size={12} />
                  Next-Gen Multimodal Translation
                </div>
                <h1 className="font-display text-7xl md:text-[120px] font-black leading-[0.85] tracking-tighter uppercase italic mb-8">
                  Breaking <br />
                  <span className="text-emerald-500">Barriers</span> <br />
                  In Real-Time.
                </h1>
              </motion.div>
            </div>
            <div className="lg:col-span-4">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="border-l border-white/10 pl-8 pb-4"
              >
                <p className="text-lg text-zinc-400 mb-8 leading-relaxed">
                  The Omni-Bridge is a high-performance accessibility gateway that bridges the gap between Sign Language and spoken conversation in real-time. Powered by Gemini Live API.
                </p>
                <Link 
                  href="/bridge"
                  className="group inline-flex items-center gap-4 bg-emerald-500 text-black px-8 py-4 rounded-sm font-black text-sm uppercase tracking-widest hover:bg-white transition-all"
                >
                  Start Translating
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Divider */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="h-px bg-white/5 w-full" />
      </div>

      {/* Features - Bento Grid with Editorial Flair */}
      <section id="technology" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <div className="max-w-2xl">
              <span className="font-mono text-[10px] text-emerald-500 uppercase tracking-[0.3em] block mb-4">Core_Technology</span>
              <h2 className="font-display text-5xl md:text-7xl font-black uppercase tracking-tighter italic leading-none">
                Neural <br /> Interpretation.
              </h2>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-zinc-500">
                <Command size={20} />
              </div>
              <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-zinc-500">
                <Plus size={20} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <motion.div 
              whileHover={{ y: -5 }}
              className="md:col-span-8 bg-zinc-900/50 border border-white/5 p-12 rounded-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                <Cpu size={240} />
              </div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-sm flex items-center justify-center mb-8">
                  <Zap className="text-emerald-500" />
                </div>
                <h3 className="font-display text-4xl font-black mb-6 uppercase tracking-tighter italic">Real-time Neural Processing</h3>
                <p className="text-zinc-400 max-w-md text-lg leading-relaxed">
                  Leveraging Gemini Live API for sub-second latency in gesture recognition and natural language synthesis. Our engine understands spatial grammar, facial expressions, and regional dialects.
                </p>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="md:col-span-4 bg-emerald-500 p-12 rounded-sm text-black flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 bg-black/10 rounded-sm flex items-center justify-center mb-8">
                  <Globe className="text-black" />
                </div>
                <h3 className="font-display text-4xl font-black mb-6 uppercase tracking-tighter italic">Global Reach</h3>
              </div>
              <p className="font-medium text-lg leading-relaxed opacity-80">
                Supporting ASL, ÍTM, BSL, and LSF with seamless translation into 10+ spoken languages.
              </p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="md:col-span-4 bg-zinc-900/50 border border-white/5 p-12 rounded-sm"
            >
              <div className="w-12 h-12 bg-white/5 rounded-sm flex items-center justify-center mb-8">
                <Shield className="text-white" />
              </div>
              <h3 className="font-display text-3xl font-black mb-6 uppercase tracking-tighter italic">Privacy First</h3>
              <p className="text-zinc-400 leading-relaxed">
                On-device landmark extraction ensures that raw video never leaves your browser. We process intent, not identity.
              </p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="md:col-span-8 bg-zinc-900/50 border border-white/5 p-12 rounded-sm flex flex-col md:flex-row gap-12 items-center"
            >
              <div className="flex-1">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-sm flex items-center justify-center mb-8">
                  <Languages className="text-indigo-500" />
                </div>
                <h3 className="font-display text-4xl font-black mb-6 uppercase tracking-tighter italic">Multimodal Synthesis</h3>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  Simultaneous high-fidelity speech synthesis and visual gloss generation. The bridge works both ways.
                </p>
              </div>
              <div className="w-full md:w-72 aspect-video bg-black rounded-sm border border-white/10 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />
                <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-[0.3em]">Visualizing_Intent...</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Impact Section - Editorial List */}
      <section id="impact" className="py-40 px-6 bg-white text-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
            <div className="lg:col-span-5">
              <span className="font-mono text-[10px] text-emerald-600 uppercase tracking-[0.3em] block mb-6">Social_Impact</span>
              <h2 className="font-display text-6xl md:text-8xl font-black uppercase tracking-tighter italic leading-[0.85] mb-12">
                Designed <br /> For Human <br /> Connection.
              </h2>
            </div>
            <div className="lg:col-span-7 flex flex-col gap-16">
              {[
                {
                  id: '01',
                  title: 'Accessibility',
                  desc: 'Making everyday interactions—from doctor visits to coffee orders—accessible to everyone, regardless of their primary language.'
                },
                {
                  id: '02',
                  title: 'Education',
                  desc: 'A powerful tool for learning sign language through real-time feedback and AI-generated visual references.'
                },
                {
                  id: '03',
                  title: 'Innovation',
                  desc: 'Pushing the boundaries of what\'s possible with Google\'s latest Multimodal AI models to solve real-world problems.'
                }
              ].map((item) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start border-t border-black/10 pt-8">
                  <span className="md:col-span-2 font-display text-5xl font-black italic text-emerald-600">{item.id}</span>
                  <div className="md:col-span-10">
                    <h4 className="font-display text-3xl font-black uppercase tracking-tighter italic mb-4">{item.title}</h4>
                    <p className="text-zinc-600 text-lg leading-relaxed max-w-xl">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-emerald-500 rounded-sm flex items-center justify-center">
              <Video className="text-black w-4 h-4" />
            </div>
            <span className="font-display font-black text-lg tracking-tighter uppercase italic">Omni-Bridge</span>
          </div>
          <div className="flex gap-8 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            <span>Built with Gemini Live API</span>
            <span>Hosted on Google Cloud</span>
            <span>Hackathon 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
