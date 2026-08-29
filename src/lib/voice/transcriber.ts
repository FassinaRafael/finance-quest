/**
 * Voice Transcription Service for Web and Telegram inputs
 */

export interface VoiceRecognitionOptions {
  lang?: string;
  onResult: (text: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

/**
 * Client-side Web Speech API listener helper.
 */
export class BrowserVoiceRecognizer {
  private recognition: unknown = null;
  private isListening = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition ||
        (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

      if (SpeechRecognition) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const instance = new (SpeechRecognition as any)();
        instance.continuous = false;
        instance.interimResults = false;
        instance.lang = 'pt-BR';
        this.recognition = instance;
      }
    }
  }

  public isSupported(): boolean {
    return this.recognition !== null;
  }

  public start(options: VoiceRecognitionOptions): void {
    if (!this.recognition) {
      options.onError?.('Reconhecimento de voz não suportado neste navegador.');
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rec = this.recognition as any;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        options.onResult(transcript);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onerror = (event: any) => {
        options.onError?.(event.error || 'Erro ao capturar áudio');
      };

      rec.onend = () => {
        this.isListening = false;
        options.onEnd?.();
      };

      this.isListening = true;
      rec.start();
    } catch (err) {
      this.isListening = false;
      options.onError?.((err as Error).message);
    }
  }

  public stop(): void {
    if (this.recognition && this.isListening) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.recognition as any).stop();
      this.isListening = false;
    }
  }
}

/**
 * Server-side Whisper API transcriber for audio buffer / files from Telegram.
 */
export async function transcribeAudioBuffer(
  audioBuffer: Buffer,
  apiKey?: string
): Promise<string | null> {
  const token = apiKey || process.env.OPENAI_API_KEY;
  if (!token) {
    console.warn('OpenAI API Key not configured for server audio transcription.');
    return null;
  }

  try {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/ogg' });
    formData.append('file', blob, 'voice.ogg');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      console.error('Whisper transcription failed:', await response.text());
      return null;
    }

    const data = (await response.json()) as { text: string };
    return data.text;
  } catch (error) {
    console.error('Error during audio transcription:', error);
    return null;
  }
}
