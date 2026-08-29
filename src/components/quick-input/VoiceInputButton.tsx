'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic } from 'lucide-react';
import { BrowserVoiceRecognizer } from '@/lib/voice/transcriber';

interface VoiceInputButtonProps {
  onTranscribedText: (text: string) => void;
  className?: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscribedText,
  className = '',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const recognizerRef = useRef<BrowserVoiceRecognizer | null>(null);

  useEffect(() => {
    recognizerRef.current = new BrowserVoiceRecognizer();
    setIsSupported(recognizerRef.current.isSupported());
  }, []);

  const handleToggleListening = () => {
    if (!recognizerRef.current) return;

    if (isListening) {
      recognizerRef.current.stop();
      setIsListening(false);
      return;
    }

    setErrorMessage(null);
    setIsListening(true);

    recognizerRef.current.start({
      lang: 'pt-BR',
      onResult: (text) => {
        setIsListening(false);
        if (text) {
          onTranscribedText(text);
        }
      },
      onError: (err) => {
        setIsListening(false);
        setErrorMessage(err === 'not-allowed' ? 'Permissão de microfone negada.' : 'Não foi possível ouvir.');
        setTimeout(() => setErrorMessage(null), 3000);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });
  };

  if (!isSupported) {
    return null; // Graceful fallback on browsers without Web Speech
  }

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <button
        type="button"
        onClick={handleToggleListening}
        className={`relative p-3 rounded-2xl border transition-all active:scale-95 flex items-center justify-center gap-2 ${
          isListening
            ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-lg shadow-rose-500/30'
            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
        }`}
        title="Gravar por voz (ex: '45 uber')"
      >
        {isListening ? (
          <>
            <motion.div
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="absolute inset-0 rounded-2xl bg-rose-500/30 blur-md pointer-events-none"
            />
            <Mic className="w-5 h-5 animate-pulse text-rose-400" />
            <span className="text-xs font-bold text-rose-400">Ouvindo...</span>
          </>
        ) : (
          <>
            <Mic className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-medium text-slate-300">Voz</span>
          </>
        )}
      </button>

      {/* Floating Audio Toast */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-full bg-slate-900 border border-indigo-500/50 text-[11px] font-semibold text-indigo-300 shadow-xl"
          >
            Fale algo como: &quot;35 almoço&quot;
          </motion.div>
        )}

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-full bg-rose-950 border border-rose-500/50 text-[11px] font-semibold text-rose-300 shadow-xl"
          >
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
