/**
 * Utility for audio processing (PCM encoding/decoding)
 */

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private scheduledSources: AudioBufferSourceNode[] = [];
  private nextStartTime = 0;
  private inputBuffer: Float32Array = new Float32Array(0);

  async startRecording(onAudioData: (base64: string) => void) {
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    
    // 2048 is ~128ms at 16kHz. We'll sub-chunk this in the callback for 40ms precision.
    this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Append to internal buffer
      const newBuffer = new Float32Array(this.inputBuffer.length + inputData.length);
      newBuffer.set(this.inputBuffer);
      newBuffer.set(inputData, this.inputBuffer.length);
      this.inputBuffer = newBuffer;

      // 40ms at 16kHz = 640 samples
      const chunkSize = 640;
      while (this.inputBuffer.length >= chunkSize) {
        const chunk = this.inputBuffer.slice(0, chunkSize);
        this.inputBuffer = this.inputBuffer.slice(chunkSize);
        
        const pcmData = this.floatTo16BitPCM(chunk);
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        onAudioData(base64);
      }
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  stopRecording() {
    this.source?.disconnect();
    this.processor?.disconnect();
    this.stream?.getTracks().forEach(t => t.stop());
    this.audioContext?.close();
    this.purgeBuffer();
  }

  purgeBuffer() {
    this.scheduledSources.forEach(s => {
      try { s.stop(); } catch (e) {}
      s.disconnect();
    });
    this.scheduledSources = [];
    this.nextStartTime = 0;
  }

  private floatTo16BitPCM(input: Float32Array) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }

  // Play PCM audio chunks
  async playAudioChunk(base64: string) {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
    }
    
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    
    const pcm = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) float32[i] = pcm[i] / 32768.0;

    const buffer = this.audioContext.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    const currentTime = this.audioContext.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime + 0.05; // Small buffer for network jitter
    }
    
    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
    this.scheduledSources.push(source);

    // Cleanup finished sources
    source.onended = () => {
      this.scheduledSources = this.scheduledSources.filter(s => s !== source);
    };
  }
}
