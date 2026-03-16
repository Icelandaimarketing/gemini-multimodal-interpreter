'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Type } from "@google/genai";
import { AudioProcessor } from '@/lib/audio-utils';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function useGeminiLive() {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastGloss, setLastGloss] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(isMuted);
  const sessionRef = useRef<any>(null);
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const systemInstructionRef = useRef<string>('');

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const connect = useCallback(async (systemInstruction: string) => {
    systemInstructionRef.current = systemInstruction;
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("NEXT_PUBLIC_GEMINI_API_KEY is missing");
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    
    if (!audioProcessorRef.current) {
      audioProcessorRef.current = new AudioProcessor();
    }

    const startSession = async () => {
      try {
        const sessionPromise = ai.live.connect({
          model: "gemini-2.5-flash-native-audio-preview-09-2025",
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
            },
            systemInstruction: systemInstructionRef.current,
            tools: [{
              functionDeclarations: [{
                name: "querySignLibrary",
                description: "Query the Firestore sign library for regional handshape patterns, grammar rules, and verified sign descriptions.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    signLanguage: { 
                      type: Type.STRING, 
                      description: "The sign language code to query (e.g., 'ASL' for American Sign Language, 'ITM' for Icelandic Sign Language)." 
                    },
                    concept: { 
                      type: Type.STRING, 
                      description: "The concept, word, or gloss to look up in the library." 
                    }
                  },
                  required: ["signLanguage", "concept"]
                }
              }]
            }]
          },
          callbacks: {
            onopen: () => {
              setIsConnected(true);
              setIsReconnecting(false);
              retryCountRef.current = 0;
              
              audioProcessorRef.current?.startRecording((base64) => {
                if (sessionRef.current && !isMutedRef.current) {
                  sessionRef.current.sendRealtimeInput({
                    media: { data: base64, mimeType: 'audio/pcm;rate=16000' }
                  });
                }
              }).catch(err => console.error("Audio capture error:", err));
            },
            onmessage: async (message: LiveServerMessage) => {
              // Handle Tool Calls
              if (message.toolCall?.functionCalls) {
                const functionResponses = [];
                for (const call of message.toolCall.functionCalls) {
                  if (call.name === "querySignLibrary") {
                    const { signLanguage, concept } = call.args as any;
                    try {
                      const path = `sign_languages/${signLanguage}/signs/${concept}`;
                      const snap = await getDoc(doc(db, path));
                      const response = snap.exists() ? snap.data() : { error: `Concept '${concept}' not found in ${signLanguage} library.` };
                      
                      functionResponses.push({
                        id: call.id,
                        name: call.name,
                        response: { result: response }
                      });
                    } catch (error) {
                      functionResponses.push({
                        id: call.id,
                        name: call.name,
                        response: { result: { error: "Failed to query library" } }
                      });
                    }
                  }
                }
                
                if (functionResponses.length > 0) {
                  sessionRef.current?.sendToolResponse({ functionResponses });
                }
                return;
              }

              // Handle interruption
              if (message.serverContent?.interrupted) {
                audioProcessorRef.current?.purgeBuffer();
                return;
              }

              // Handle audio output
              const parts = message.serverContent?.modelTurn?.parts;
              const base64Audio = parts?.[0]?.inlineData?.data;
              if (base64Audio) {
                audioProcessorRef.current?.playAudioChunk(base64Audio);
              }

              // Handle transcriptions/gloss
              const text = parts?.[0]?.text;
              if (text) {
                setTranscript(prev => prev + ' ' + text);
                const glossMatch = text.match(/\[GLOSS: (.*?)\]/);
                if (glossMatch) {
                  setLastGloss(glossMatch[1]);
                }
              }
            },
            onclose: () => {
              setIsConnected(false);
              handleReconnect();
            },
            onerror: (err) => {
              console.error("Gemini Live Error:", err);
              setIsConnected(false);
              handleReconnect();
            },
          },
        });

        sessionRef.current = await sessionPromise;
      } catch (err) {
        console.error("Failed to connect:", err);
        handleReconnect();
      }
    };

    const handleReconnect = () => {
      if (reconnectTimeoutRef.current) return;
      
      setIsReconnecting(true);
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
      retryCountRef.current++;

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        startSession();
      }, delay);
    };

    await startSession();
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    sessionRef.current?.close();
    audioProcessorRef.current?.stopRecording();
    setIsConnected(false);
    setIsReconnecting(false);
    retryCountRef.current = 0;
  }, []);

  const sendVideoFrame = useCallback((base64Frame: string) => {
    if (sessionRef.current && isConnected) {
      sessionRef.current.sendRealtimeInput({
        media: { data: base64Frame, mimeType: 'image/jpeg' }
      });
    }
  }, [isConnected]);

  return {
    isConnected,
    isReconnecting,
    connect,
    disconnect,
    sendVideoFrame,
    transcript,
    lastGloss,
    isMuted,
    setIsMuted,
  };
}
