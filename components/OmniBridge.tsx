'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useGeminiLive } from '@/hooks/use-gemini-live';
import { Camera, Mic, MicOff, Video, VideoOff, LogIn, Settings, MessageSquare, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getClientAuth, db, storage, handleFirestoreError, OperationType } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, getDocFromServer } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import { generateConceptIllustration, generateSignVideo } from '@/lib/ai-gen';
import { initLandmarkers, extractLandmarks } from '@/lib/landmarks';
import { GoogleGenAI, Type } from "@google/genai";
import { Check, X, ThumbsUp, ThumbsDown, Send } from 'lucide-react';

interface FeedItem {
  id: string;
  type: 'transcript' | 'sign' | 'generated' | 'video';
  content: string;
  gloss?: string;
  timestamp: number;
  isCorrected?: boolean;
}

const SIGN_LANGUAGES = [
  { id: 'ASL', name: 'American Sign Language (ASL)', region: 'North America', dialects: ['Standard', 'Black ASL', 'Tactile'] },
  { id: 'ITM', name: 'Íslenskt táknmál (ÍTM)', region: 'Iceland', dialects: ['Standard', 'North', 'South'] },
  { id: 'BSL', name: 'British Sign Language (BSL)', region: 'United Kingdom', dialects: ['Standard', 'Scottish', 'Northern'] },
  { id: 'LSF', name: 'Langue des Signes Française (LSF)', region: 'France', dialects: ['Standard', 'Marseille'] },
];

const LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-BR', name: 'Portuguese' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'zh-CN', name: 'Chinese' },
  { code: 'is-IS', name: 'Icelandic' },
];

// Error Boundary Component
function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3 text-red-500 mb-4">
      <AlertCircle className="shrink-0 mt-0.5" size={18} />
      <div className="text-sm">
        <p className="font-bold mb-1">System Error</p>
        <p className="opacity-80">{error}</p>
      </div>
    </div>
  );
}

export default function OmniBridge() {
  const [user, setUser] = useState<User | null>(null);
  const [prefs, setPrefs] = useState<any>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [selectedSignLanguage, setSelectedSignLanguage] = useState('ASL');
  const [selectedDialect, setSelectedDialect] = useState('Standard');
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeepAnalysis, setIsDeepAnalysis] = useState(false);
  const [correctionId, setCorrectionId] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState('');
  const [isRecordingCorrection, setIsRecordingCorrection] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [currentLandmarks, setCurrentLandmarks] = useState<any>(null);
  const [deepAnalysisResult, setDeepAnalysisResult] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  const { isConnected, isReconnecting, connect, disconnect, sendVideoFrame, transcript, lastGloss, isMuted, setIsMuted } = useGeminiLive();

  // Initialize Landmarkers
  useEffect(() => {
    initLandmarkers().catch(err => console.error("Landmarker init failed:", err));
  }, []);

  // Auto-scroll feed
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feed]);

  // Handle Transcripts in Feed
  const lastTranscriptRef = useRef('');
  useEffect(() => {
    if (transcript && transcript !== lastTranscriptRef.current) {
      const newText = transcript.replace(lastTranscriptRef.current, '').trim();
      if (newText) {
        setFeed(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          type: 'transcript',
          content: newText,
          timestamp: Date.now()
        }]);
      }
      lastTranscriptRef.current = transcript;
    }
  }, [transcript]);

  // Hybrid Asset Loading Logic with Veo Fallback
  useEffect(() => {
    async function processGloss() {
      if (!lastGloss || !user) return;

      try {
        const path = `sign_languages/${selectedSignLanguage}/signs/${lastGloss}`;
        const snap = await getDoc(doc(db, path));
        
        let finalAsset = null;
        let type: 'sign' | 'video' | 'generated' = 'sign';

        if (snap.exists()) {
          // Found in library
          finalAsset = snap.data().videoUrl || snap.data().imageUrl;
          type = 'sign';
        } else {
          // Fallback to AI Generation
          setIsGenerating(true);
          
          // Try Veo first for video
          const videoUrl = await generateSignVideo(lastGloss, selectedSignLanguage);
          if (videoUrl) {
            finalAsset = videoUrl;
            type = 'video';
          } else {
            // Secondary fallback to static illustration
            const imageUrl = await generateConceptIllustration(lastGloss, selectedSignLanguage);
            if (imageUrl) {
              finalAsset = imageUrl;
              type = 'generated';
            }
          }
          setIsGenerating(false);
        }

        if (finalAsset) {
          const newItem: FeedItem = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            content: finalAsset,
            gloss: lastGloss,
            timestamp: Date.now()
          };
          setFeed(prev => [...prev, newItem]);

          // Capture Interaction for Self-Learning
          await addDoc(collection(db, 'interactions'), {
            userId: user.uid,
            type: 'voice-to-sign',
            input: 'audio_stream', // Placeholder for actual audio reference if needed
            output: finalAsset,
            gloss: lastGloss,
            isCorrected: false,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `sign_languages/${selectedSignLanguage}/signs/${lastGloss}`);
      }
    }
    processGloss();
  }, [lastGloss, selectedSignLanguage, user]);

  const handleCorrection = async (itemId: string, gloss: string) => {
    setCorrectionId(itemId);
    setCorrectionText(gloss);
  };

  const submitCorrection = async () => {
    if (!correctionId || !user) return;

    setIsUploading(true);
    try {
      let videoUrl = '';
      if (recordedBlob) {
        const videoRef = ref(storage, `corrections/${user.uid}/${Date.now()}.webm`);
        const uploadResult = await uploadBytes(videoRef, recordedBlob);
        videoUrl = await getDownloadURL(uploadResult.ref);
      }

      // Add to corrections collection for admin review
      await addDoc(collection(db, 'corrections'), {
        userId: user.uid,
        originalGloss: feed.find(i => i.id === correctionId)?.gloss || '',
        correctedGloss: correctionText,
        videoUrl: videoUrl,
        landmarks: currentLandmarks ? JSON.stringify(currentLandmarks) : null,
        status: 'pending',
        signLanguage: selectedSignLanguage,
        dialect: prefs?.dialect || 'standard',
        timestamp: Date.now()
      });

      // Also log as interaction
      await addDoc(collection(db, 'interactions'), {
        userId: user.uid,
        type: 'correction',
        interactionId: correctionId,
        correction: correctionText,
        timestamp: Date.now()
      });

      setFeed(prev => prev.map(item => 
        item.id === correctionId ? { ...item, isCorrected: true } : item
      ));
      setCorrectionId(null);
      setCorrectionText('');
      setRecordedBlob(null);
      triggerHaptic('success');
    } catch (error) {
      console.error("Correction failed:", error);
      setSystemError("Failed to submit correction. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const startRecordingCorrection = async () => {
    if (!videoRef.current?.srcObject) return;
    
    try {
      const stream = videoRef.current.srcObject as MediaStream;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setRecordedBlob(blob);
        setIsRecordingCorrection(false);
        triggerHaptic('success');
      };

      mediaRecorder.start();
      setIsRecordingCorrection(true);
      triggerHaptic('light');

      // Record for 3 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 3000);
    } catch (err) {
      console.error("Recording failed:", err);
    }
  };

  // Test Connection
  useEffect(() => {
    async function testConnection() {
      try {
        // Use a path that is publicly readable to avoid permission errors
        await getDocFromServer(doc(db, 'sign_languages', 'ping'));
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('the client is offline')) {
            setSystemError("Firebase connection failed. Please check your configuration.");
          }
          // Permission errors are expected if 'ping' doc doesn't exist, 
          // we only care about the 'offline' state.
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    setIsMuted(!isMicOn);
  }, [isMicOn, setIsMuted]);

  useEffect(() => {
    const auth = getClientAuth();
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const docRef = doc(db, 'users', u.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setPrefs(snap.data());
          } else {
            const defaultUser = { 
              uid: u.uid, 
              displayName: u.displayName || 'User',
              email: u.email || '',
              preferredLanguage: 'en-US',
              role: 'user' 
            };
            await setDoc(docRef, defaultUser);
            setPrefs(defaultUser);
          }
        } catch (error) {
          console.error("User profile fetch failed:", error);
        }
      }
    });
    return unsub;
  }, []);

  const syncLibrary = async () => {
    try {
      const res = await fetch('/api/admin/ingest', { method: 'POST' });
      if (res.ok) {
        triggerHaptic('success');
        alert("Library synced successfully with open-source datasets.");
      }
    } catch (err) {
      console.error("Sync failed:", err);
    }
  };

  const handleLogin = async () => {
    const auth = getClientAuth();
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const toggleCamera = async () => {
    if (isCameraOn) {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
      setIsCameraOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraOn(true);
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    }
  };

  // Frame capture loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCameraOn && isConnected) {
      interval = setInterval(async () => {
        if (videoRef.current && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, 320, 240);
            // High quality JPEG for sign accuracy
            const base64 = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
            sendVideoFrame(base64);

            // Extract and log landmarks for self-learning
            try {
              const landmarks = await extractLandmarks(videoRef.current);
              if (landmarks) {
                setCurrentLandmarks(landmarks);
                
                // Draw skeletal overlay
                if (overlayCanvasRef.current) {
                  const oCtx = overlayCanvasRef.current.getContext('2d');
                  if (oCtx) {
                    oCtx.clearRect(0, 0, 640, 480);
                    oCtx.lineWidth = 2;
                    
                    // Draw Pose
                    if (landmarks.pose && landmarks.pose[0]) {
                      oCtx.strokeStyle = '#10b981'; // Emerald
                      landmarks.pose[0].forEach((lm: any) => {
                        oCtx.beginPath();
                        oCtx.arc(lm.x * 640, lm.y * 480, 2, 0, 2 * Math.PI);
                        oCtx.stroke();
                      });
                    }
                    
                    // Draw Hands
                    if (landmarks.hands) {
                      oCtx.strokeStyle = '#6366f1'; // Indigo
                      landmarks.hands.forEach((hand: any) => {
                        hand.forEach((lm: any) => {
                          oCtx.beginPath();
                          oCtx.arc(lm.x * 640, lm.y * 480, 2, 0, 2 * Math.PI);
                          oCtx.stroke();
                        });
                      });
                    }
                  }
                }

                if (user) {
                  // Deep Analysis Path
                  if (isDeepAnalysis && isConnected) {
                    try {
                      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
                      if (!apiKey) throw new Error("API Key missing");
                      
                      const ai = new GoogleGenAI({ apiKey });
                      const response = await ai.models.generateContent({
                        model: "gemini-3.1-pro-preview",
                        contents: [
                          {
                            text: `Interpret the following skeletal landmark data for ${selectedSignLanguage || 'Sign Language'}.
                            
                            Context:
                            - Region: ${SIGN_LANGUAGES.find(s => s.id === selectedSignLanguage)?.region || 'Global'}
                            - Dialect: ${selectedDialect || 'Standard'}
                            - Previous Gloss: ${lastGloss || 'None'}
                            
                            Landmark Data (JSON):
                            ${JSON.stringify(landmarks).substring(0, 10000)}
                            
                            Task:
                            1. Identify the most likely sign (Gloss).
                            2. Provide a natural language translation.
                            3. Estimate confidence (0-1).
                            4. Identify the emotional register (e.g., neutral, excited, urgent).`
                          }
                        ],
                        config: {
                          responseMimeType: "application/json",
                          responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                              gloss: { type: Type.STRING },
                              translation: { type: Type.STRING },
                              confidence: { type: Type.NUMBER },
                              emotionalRegister: { type: Type.STRING },
                              suggestedCorrections: { 
                                type: Type.ARRAY, 
                                items: { type: Type.STRING } 
                              }
                            },
                            required: ["gloss", "translation", "confidence"]
                          }
                        }
                      });

                      const deepResult = JSON.parse(response.text || "{}");
                      setDeepAnalysisResult(deepResult);
                      if (deepResult.confidence > 0.7) {
                        setFeed(prev => [...prev, {
                          id: Math.random().toString(36).substr(2, 9),
                          type: 'transcript',
                          content: `[DEEP_ANALYSIS]: ${deepResult.translation}`,
                          timestamp: Date.now()
                        }]);
                      }
                    } catch (err) {
                      console.error("Deep Analysis failed:", err);
                    }
                  }

                  // We log landmarks periodically to avoid overwhelming Firestore
                  if (Math.random() > 0.9) { // 10% sampling for training data
                    await addDoc(collection(db, 'interactions'), {
                      userId: user.uid,
                      type: 'landmark-capture',
                      landmarks: JSON.stringify(landmarks),
                      metadata: {
                        signLanguage: selectedSignLanguage,
                        timestamp: Date.now()
                      },
                      timestamp: Date.now()
                    });
                  }
                }
              }
            } catch (err) {
              console.error("Landmark extraction failed:", err);
            }
          }
        }
      }, 666); // ~1.5 FPS for optimal token usage and accuracy
    }
    return () => clearInterval(interval);
  }, [isCameraOn, isConnected, sendVideoFrame, user, selectedSignLanguage, selectedDialect, isDeepAnalysis, lastGloss]);

  const triggerHaptic = (type: 'success' | 'warning' | 'error' | 'light') => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      switch (type) {
        case 'success': navigator.vibrate([100, 50, 100]); break;
        case 'warning': navigator.vibrate(200); break;
        case 'error': navigator.vibrate([300, 100, 300]); break;
        case 'light': navigator.vibrate(50); break;
      }
    }
  };

  const startBridge = () => {
    triggerHaptic('success');
    const langName = LANGUAGES.find(l => l.code === selectedLanguage)?.name || 'English';
    const signLang = SIGN_LANGUAGES.find(s => s.id === selectedSignLanguage);
    
    const systemInstruction = `You are the Omni-Bridge, a high-performance real-time multimodal interpreter.
You are an expert in ÍTM (Icelandic Sign Language) and ASL. Be aware that ÍTM has unique spatial grammar compared to ASL. 
If the user is in the Iceland region (using ÍTM), prioritize ÍTM handshapes and spatial structures.

Your goal is to facilitate seamless communication between a Deaf person (using ${signLang?.name}) and a Hearing person (using spoken ${langName}).

1. CONTEXTUAL GROUNDING (Firestore RAG):
   - You have access to the 'querySignLibrary' tool.
   - Before interpreting a complex or ambiguous sign, you MUST query the library for regional handshape patterns and grammar rules to ensure 100% accuracy.
   - Use the 'signLanguage' code (${signLang?.id}) and the 'concept' you are observing.

2. SIGN-TO-SPEECH (Vision -> Audio):
   - Monitor the video stream.
   - Identify ${signLang?.name} movements, facial expressions, and spatial grammar.
   - Translate these movements into natural, fluent spoken ${langName}.
   - Output the translation as spoken audio for the hearing user.
   - Also provide a text transcript of what you said.

3. SPEECH-TO-SIGN (Audio -> Visual):
   - Listen to the hearing user's spoken ${langName}.
   - Translate the intent into '${signLang?.name} Gloss' (e.g., 'ME GO STORE NOW').
   - For every key concept or phrase, output a bracketed gloss tag like [GLOSS: CONCEPT] in your text response.
   - Keep the gloss concise and representative of ${signLang?.id} structure.

4. DIALECT AWARENESS:
   - The Deaf user is specifically using ${signLang?.name} (${signLang?.id}) from the ${signLang?.region} region.
   - The hearing user is speaking ${langName}. Translate all input/output accordingly.

5. TONE & ACCURACY:
   - Maintain the emotional register. If the signer is excited, your voice output should reflect that.
   - Be an invisible bridge. Do not add your own commentary.`;
    connect(systemInstruction);
  };

  useEffect(() => {
    if (transcript) {
      triggerHaptic('light');
    }
  }, [transcript]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#151619] flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white border-4 border-black p-10 text-center shadow-[20px_20px_0px_rgba(0,0,0,0.2)]"
        >
          <div className="w-20 h-20 bg-[#151619] rounded-sm flex items-center justify-center mx-auto mb-8 transform -rotate-3">
            <Video className="text-emerald-500 w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-[#151619] mb-2 uppercase tracking-tighter italic">Omni-Bridge</h1>
          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest mb-10">Multimodal_Translation_Protocol_v1.0.4</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-[#151619] hover:bg-emerald-600 text-white font-mono font-black py-5 rounded-sm flex items-center justify-center gap-3 transition-all uppercase tracking-widest group"
          >
            <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
            Initialize_Session
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-emerald-500 selection:text-black">
      {/* Hardware Header */}
      <header className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Link 
            href="/"
            className="p-2 hover:bg-white/5 rounded-sm transition-colors text-zinc-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-sm flex items-center justify-center">
              <Video size={18} className="text-black" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-sm tracking-tighter uppercase italic leading-none">Omni-Bridge</span>
              <span className="text-zinc-500 font-mono text-[8px] uppercase tracking-[0.2em]">Translation_Protocol_v1.0.4</span>
            </div>
          </div>
          
          <div className="h-6 w-px bg-white/10" />
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">System_Status</span>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : isReconnecting ? 'bg-amber-500 animate-pulse' : 'bg-zinc-700'}`} />
                <span className="text-[9px] font-mono font-bold uppercase tracking-tighter text-zinc-300">
                  {isConnected ? 'Live_Active' : isReconnecting ? 'Reconnecting' : 'Standby_Mode'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">Voice_Target</span>
              <select 
                id="voice-target"
                name="voice-target"
                value={selectedLanguage}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedLanguage(val);
                  if (val === 'is-IS') setSelectedSignLanguage('ITM');
                  else setSelectedSignLanguage('ASL');
                }}
                disabled={isConnected}
                className="bg-transparent text-[10px] font-mono font-bold outline-none cursor-pointer text-emerald-500 hover:text-white transition-colors disabled:opacity-30"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code} className="bg-[#151619]">{lang.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">Sign_Source</span>
              <select 
                id="sign-source"
                name="sign-source"
                value={selectedSignLanguage}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedSignLanguage(val);
                  setSelectedDialect('Standard');
                }}
                disabled={isConnected}
                className="bg-transparent text-[10px] font-mono font-bold outline-none cursor-pointer text-emerald-500 hover:text-white transition-colors disabled:opacity-30"
              >
                {SIGN_LANGUAGES.map(sl => (
                  <option key={sl.id} value={sl.id} className="bg-[#151619]">{sl.id}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">Regional_Dialect</span>
              <select 
                id="regional-dialect"
                name="regional-dialect"
                value={selectedDialect}
                onChange={(e) => setSelectedDialect(e.target.value)}
                disabled={isConnected}
                className="bg-transparent text-[10px] font-mono font-bold outline-none cursor-pointer text-emerald-500 hover:text-white transition-colors disabled:opacity-30"
              >
                {SIGN_LANGUAGES.find(s => s.id === selectedSignLanguage)?.dialects.map(d => (
                  <option key={d} value={d} className="bg-[#151619]">{d}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">Deep_Analysis</span>
              <button 
                onClick={() => setIsDeepAnalysis(!isDeepAnalysis)}
                className={`text-[10px] font-mono font-bold text-left transition-colors ${isDeepAnalysis ? 'text-emerald-500' : 'text-zinc-600'}`}
              >
                {isDeepAnalysis ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 pl-6 border-l border-white/10">
            <button 
              onClick={syncLibrary}
              className="p-2 hover:bg-white/5 rounded-sm transition-colors group"
              title="System Settings"
            >
              <Settings size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
            </button>
            <div className="w-8 h-8 rounded-sm bg-white/5 overflow-hidden border border-white/10 relative group cursor-pointer">
              {user.photoURL && (
                <Image src={user.photoURL} alt="User" fill sizes="32px" className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content: Split Hardware Layout */}
      <main className="flex-1 flex flex-col lg:grid lg:grid-cols-2 overflow-hidden">
        {/* Left Panel: Signer (Camera) - Hardware Aesthetic */}
        <div className="bg-[#151619] relative flex flex-col border-r border-white/5 h-[50vh] lg:h-full">
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            <div className="bg-black/40 backdrop-blur-md px-2 py-1 rounded-sm border border-white/5">
              <span className="text-[9px] font-mono font-bold text-emerald-500 tracking-widest uppercase">Input_Feed_01</span>
            </div>
            {isCameraOn && (
              <div className="bg-red-500/20 backdrop-blur-md px-2 py-1 rounded-sm border border-red-500/30 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-mono font-bold text-red-500 tracking-widest uppercase">REC</span>
              </div>
            )}
          </div>

          {/* Technical HUD Overlay */}
          <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 w-48">
            <div className="bg-black/60 backdrop-blur-md p-3 rounded-sm border border-white/5 font-mono">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[8px] text-zinc-500 uppercase tracking-widest">Confidence</span>
                <span className="text-[10px] text-emerald-500 font-bold">{(deepAnalysisResult?.confidence * 100 || 0).toFixed(1)}%</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(deepAnalysisResult?.confidence * 100 || 0)}%` }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </div>

            <div className="bg-black/60 backdrop-blur-md p-3 rounded-sm border border-white/5 font-mono">
              <span className="text-[8px] text-zinc-500 uppercase tracking-widest block mb-1">Emotional Register</span>
              <span className="text-[10px] text-white font-bold uppercase tracking-tighter">
                {deepAnalysisResult?.emotionalRegister || 'Analyzing...'}
              </span>
            </div>

            <div className="bg-black/60 backdrop-blur-md p-3 rounded-sm border border-white/5 font-mono">
              <span className="text-[8px] text-zinc-500 uppercase tracking-widest block mb-1">Active Landmarks</span>
              <div className="flex gap-1 flex-wrap">
                <div className={`w-2 h-2 rounded-full ${currentLandmarks?.pose ? 'bg-emerald-500' : 'bg-white/10'}`} title="Pose" />
                <div className={`w-2 h-2 rounded-full ${currentLandmarks?.hands?.length > 0 ? 'bg-indigo-500' : 'bg-white/10'}`} title="Hands" />
              </div>
            </div>
          </div>

          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            {!isCameraOn && (
              <div className="text-center">
                <VideoOff size={32} className="text-zinc-800 mx-auto mb-3" />
                <p className="text-zinc-600 font-mono text-[10px] uppercase tracking-widest">Optical_Sensor_Offline</p>
              </div>
            )}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover ${isCameraOn ? 'opacity-60' : 'opacity-0'} transition-opacity duration-1000`}
            />
            {/* Skeletal Overlay Canvas */}
            <canvas 
              ref={overlayCanvasRef} 
              width={640} 
              height={480} 
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
            />
            <canvas ref={canvasRef} width={320} height={240} className="hidden" />
            
            {/* Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-10" 
                 style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          </div>

          {/* Live Subtitles - Hardware Style */}
          <div className="absolute bottom-6 left-6 right-6 z-20">
            <AnimatePresence>
              {transcript && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-500 text-[#151619] p-4 rounded-sm shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-black/10" />
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 bg-[#151619] rounded-full animate-pulse" />
                    <span className="text-[9px] font-mono font-black uppercase tracking-widest">Live_Output_Stream</span>
                  </div>
                  <p className="text-lg font-bold leading-tight tracking-tight uppercase">{transcript}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Panel: Visual Feed & Library - Hardware Aesthetic */}
        <div className="bg-[#0F0F0F] relative flex flex-col h-[50vh] lg:h-full overflow-hidden border-l border-white/5">
          <div className="h-12 border-b border-white/5 px-6 flex items-center justify-between bg-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Visual_Buffer_02</span>
              {isGenerating && (
                <div className="flex gap-0.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              )}
            </div>
            <button 
              onClick={() => setFeed([])}
              className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500 hover:text-red-500 transition-colors"
            >
              Clear_Cache
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
            <AnimatePresence initial={false}>
              {feed.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-2"
                >
                  {item.type === 'transcript' ? (
                    <div className="bg-white/5 p-4 rounded-sm border border-white/5 shadow-sm max-w-[85%] self-start relative">
                      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                      <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest block mb-1">Transcript_Log</span>
                      <p className="text-sm font-medium text-white leading-relaxed">{item.content}</p>
                    </div>
                  ) : (
                    <div className="relative group max-w-[90%] self-end">
                      <div className="w-64 bg-[#151619] rounded-sm border border-white/10 overflow-hidden shadow-2xl relative">
                        <div className="aspect-square relative">
                          {item.type === 'video' ? (
                            <video src={item.content} autoPlay loop muted className="w-full h-full object-cover" />
                          ) : (
                            <Image src={item.content} alt={item.gloss || 'Sign'} fill sizes="256px" className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        
                        <div className="p-3 bg-black/40 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Gloss_ID</span>
                            <span className="text-xs font-mono font-black text-white uppercase italic tracking-tighter">{item.gloss}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-mono font-bold text-emerald-500 uppercase tracking-widest">
                              {item.type === 'video' ? 'VEO_GEN' : item.type === 'generated' ? 'CONCEPT' : 'LIB_REF'}
                            </span>
                            <button 
                              onClick={() => handleCorrection(item.id, item.gloss || '')}
                              className="p-1.5 hover:bg-white/10 rounded-sm transition-colors"
                            >
                              <Settings size={12} className="text-zinc-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={feedEndRef} />
          </div>

          {/* Correction Modal - Hardware Style */}
          <AnimatePresence>
            {correctionId && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-28 left-6 right-6 bg-[#151619] border border-white/10 p-6 rounded-sm shadow-[0_30px_60px_rgba(0,0,0,0.6)] z-50"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono font-black uppercase tracking-widest text-emerald-500">Manual_Correction_Protocol</span>
                    <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">Help improve the model by providing the correct sign</span>
                  </div>
                  <button onClick={() => {
                    setCorrectionId(null);
                    setRecordedBlob(null);
                  }} className="text-zinc-500 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <input 
                      id="correction-gloss"
                      name="correction-gloss"
                      type="text" 
                      value={correctionText}
                      onChange={(e) => setCorrectionText(e.target.value)}
                      placeholder="ENTER_CORRECT_GLOSS..."
                      className="flex-1 bg-black/40 border border-white/10 rounded-sm px-4 py-3 text-xs font-mono font-bold text-white outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <button 
                      onClick={startRecordingCorrection}
                      disabled={isRecordingCorrection || !isCameraOn}
                      className={`flex-1 py-3 rounded-sm font-mono font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${
                        isRecordingCorrection 
                          ? 'bg-red-500 text-white border-red-500 animate-pulse' 
                          : recordedBlob 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                            : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                      } disabled:opacity-30`}
                    >
                      <Video size={14} />
                      {isRecordingCorrection ? 'Recording...' : recordedBlob ? 'Video Captured' : 'Record Correct Sign'}
                    </button>

                    <button 
                      onClick={submitCorrection}
                      disabled={isUploading || !correctionText}
                      className="flex-1 bg-emerald-500 hover:bg-white text-black py-3 rounded-sm transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                    >
                      {isUploading ? (
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                        {isUploading ? 'Uploading...' : 'Commit Correction'}
                      </span>
                    </button>
                  </div>
                  
                  {recordedBlob && (
                    <p className="text-[8px] font-mono text-emerald-500 uppercase tracking-widest text-center">
                      ✓ Video evidence attached to correction
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hardware Controls Panel */}
          <div className="p-8 border-t border-white/5 bg-black/40 backdrop-blur-xl">
            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Optical</span>
                <button 
                  onClick={toggleCamera}
                  className={`w-12 h-12 rounded-sm flex items-center justify-center transition-all border ${isCameraOn ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-white/5 text-zinc-500 border-white/10 hover:bg-white/10'}`}
                >
                  {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
                </button>
              </div>

              <div className="flex flex-col items-center gap-2">
                <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest">System_Bridge</span>
                <button 
                  onClick={isConnected ? disconnect : startBridge}
                  className={`px-12 py-4 rounded-sm font-mono font-black text-sm uppercase tracking-widest transition-all shadow-2xl ${isConnected ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-emerald-500 text-black hover:bg-white'}`}
                >
                  {isConnected ? 'Terminate' : 'Initialize'}
                </button>
              </div>

              <div className="flex flex-col items-center gap-2">
                <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Acoustic</span>
                <button 
                  onClick={() => setIsMicOn(!isMicOn)}
                  className={`w-12 h-12 rounded-sm flex items-center justify-center transition-all border ${isMicOn ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-white/5 text-zinc-500 border-white/10 hover:bg-white/10'}`}
                >
                  {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
