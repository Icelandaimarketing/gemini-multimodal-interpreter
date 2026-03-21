'use client';

import React, { useState, useEffect } from 'react';
import { db, getClientAuth } from '@/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Shield, ArrowRight, Video, User, Clock, Database } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface Correction {
  id: string;
  userId: string;
  originalGloss: string;
  correctedGloss: string;
  videoUrl?: string;
  landmarks?: string;
  status: 'pending' | 'approved' | 'rejected';
  signLanguage: string;
  dialect?: string;
  timestamp: number;
}

export default function AdminDashboard() {
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getClientAuth();
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Check admin status via Firestore role field
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const isAdminUser = userDoc.exists() && userDoc.data()?.role === 'admin';
          setIsAdmin(isAdminUser);

          if (isAdminUser) {
            const q = query(collection(db, 'corrections'), where('status', '==', 'pending'));
            const unsubscribeDocs = onSnapshot(q, (snapshot) => {
              const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Correction));
              setCorrections(data.sort((a, b) => b.timestamp - a.timestamp));
              setLoading(false);
            });
            return () => unsubscribeDocs();
          } else {
            setLoading(false);
          }
        } catch (error) {
          console.error('Admin check failed:', error);
          setIsAdmin(false);
          setLoading(false);
        }
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleAction = async (correction: Correction, action: 'approve' | 'reject') => {
    try {
      const correctionRef = doc(db, 'corrections', correction.id);
      
      if (action === 'approve') {
        // 1. Promote to official library
        const libraryPath = `sign_languages/${correction.signLanguage}/signs`;
        await addDoc(collection(db, libraryPath), {
          gloss: correction.correctedGloss,
          videoUrl: correction.videoUrl || '',
          dialect: correction.dialect || 'Standard',
          status: 'verified',
          ingestedAt: serverTimestamp(),
          source: 'User_Correction',
          contributorId: correction.userId
        });

        // 2. Update correction status
        await updateDoc(correctionRef, { status: 'approved' });
      } else {
        await updateDoc(correctionRef, { status: 'rejected' });
      }
    } catch (error) {
      console.error('Admin action failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#151619] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#151619] flex flex-col items-center justify-center p-6 text-center">
        <Shield size={48} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Access Denied</h1>
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest mb-8">Administrative_Privileges_Required</p>
        <Link href="/" className="bg-white text-[#151619] px-6 py-3 rounded-sm font-mono font-bold uppercase tracking-widest hover:bg-emerald-500 transition-colors">
          Return_to_Base
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E6E6E6] text-[#151619] font-sans">
      <header className="h-16 border-b border-black/10 px-8 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#151619] rounded-sm flex items-center justify-center">
            <Shield size={18} className="text-emerald-500" />
          </div>
          <h1 className="font-black text-lg uppercase tracking-tighter italic">Admin_Verification_Protocol</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">Active Queue</span>
            <span className="text-sm font-mono font-bold text-emerald-600">{corrections.length} PENDING</span>
          </div>
          <Link href="/" className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400 hover:text-[#151619]">Exit_Console</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8">
        <div className="grid grid-cols-1 gap-6">
          <AnimatePresence mode="popLayout">
            {corrections.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-black/5 rounded-sm overflow-hidden shadow-sm flex flex-col md:flex-row"
              >
                {/* Visual Evidence */}
                <div className="w-full md:w-72 aspect-video md:aspect-square bg-black relative">
                  {item.videoUrl ? (
                    <video src={item.videoUrl} controls className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700">
                      <Video size={32} className="mb-2" />
                      <span className="text-[9px] font-mono uppercase tracking-widest">No_Video_Evidence</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex flex-col gap-1">
                    <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-sm border border-white/10">
                      <span className="text-[9px] font-mono font-bold text-emerald-500 uppercase tracking-widest">{item.signLanguage}</span>
                    </div>
                    {item.dialect && (
                      <div className="bg-indigo-500/60 backdrop-blur-md px-2 py-1 rounded-sm border border-white/10">
                        <span className="text-[9px] font-mono font-bold text-white uppercase tracking-widest">{item.dialect}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Data & Actions */}
                <div className="flex-1 p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Original</span>
                        <span className="text-xl font-black text-zinc-300 uppercase tracking-tighter line-through">{item.originalGloss}</span>
                      </div>
                      <ArrowRight className="text-emerald-500" size={24} />
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Proposed Correction</span>
                        <span className="text-2xl font-black text-[#151619] uppercase tracking-tighter italic">{item.correctedGloss}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                          <User size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Contributor</span>
                          <span className="text-[10px] font-mono font-bold truncate w-24">{item.userId}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                          <Clock size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Submitted</span>
                          <span className="text-[10px] font-mono font-bold">{new Date(item.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                          <Database size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Landmarks</span>
                          <span className="text-[10px] font-mono font-bold text-emerald-600">{item.landmarks ? 'AVAILABLE' : 'NONE'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleAction(item, 'approve')}
                      className="flex-1 bg-[#151619] hover:bg-emerald-600 text-white py-4 rounded-sm font-mono font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                    >
                      <Check size={16} />
                      Promote_to_Library
                    </button>
                    <button 
                      onClick={() => handleAction(item, 'reject')}
                      className="px-8 border-2 border-black/10 hover:border-red-500 hover:text-red-500 py-4 rounded-sm font-mono font-bold text-xs uppercase tracking-widest transition-all"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {corrections.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-black/10 rounded-sm">
              <Database size={48} className="text-zinc-200 mx-auto mb-4" />
              <p className="text-zinc-400 font-mono text-xs uppercase tracking-widest">Verification_Queue_Empty</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
