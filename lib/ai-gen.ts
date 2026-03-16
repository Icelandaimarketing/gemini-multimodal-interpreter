import { GoogleGenAI } from "@google/genai";

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

async function ensureApiKey() {
  if (typeof window !== 'undefined' && window.aistudio) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
    }
  }
  return process.env.API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
}

export async function generateConceptIllustration(concept: string, signLanguage: string) {
  const apiKey = await ensureApiKey();
  if (!apiKey) throw new Error("API Key required for image generation");

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `A clear, minimalist concept illustration of the sign language concept: "${concept}". 
  Style: High-contrast, educational, 3D claymorphism or clean vector art. 
  Context: This is for a ${signLanguage} user. 
  Focus on the hand shape and movement intent. 
  Background: Neutral, soft grey.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image generation failed:", error);
    return null;
  }
}

export async function generateSignVideo(concept: string, signLanguage: string) {
  const apiKey = await ensureApiKey();
  if (!apiKey) throw new Error("API Key required for video generation");

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `A high-fidelity educational video of a person performing the ${signLanguage} sign for "${concept}". 
  The person should be centered, with clear hand movements and facial expressions. 
  Background: Solid neutral studio background. 
  Lighting: Bright, professional studio lighting.`;

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) return null;

    const response = await fetch(downloadLink, {
      method: 'GET',
      headers: {
        'x-goog-api-key': apiKey,
      },
    });

    if (!response.ok) throw new Error("Failed to download generated video");
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Video generation failed:", error);
    return null;
  }
}
