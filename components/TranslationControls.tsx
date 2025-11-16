
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { languages } from '../constants/languages';
import { voices } from '../constants/voices';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import type { Language, Voice } from '../types/index';

interface TranslationControlsProps {
  onLanguageChange: (language: Language) => void;
  onVoiceChange: (voice: Voice) => void;
  selectedVoice: Voice;
  onTranslate: () => void;
  isDisabled: boolean;
}

type PreviewStatus = {
  voiceId: string | null;
  status: 'idle' | 'loading' | 'playing';
};

export const TranslationControls: React.FC<TranslationControlsProps> = ({ 
  onLanguageChange, 
  onVoiceChange,
  selectedVoice,
  onTranslate, 
  isDisabled 
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>({ voiceId: null, status: 'idle' });
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      audioContextRef.current?.close();
    };
  }, []);

  const handleLanguageSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLang = languages.find(lang => lang.code === e.target.value);
    if (selectedLang) {
      onLanguageChange(selectedLang);
    }
  };

  const stopCurrentPreview = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) { /* ignore if already stopped */ }
      audioSourceRef.current = null;
    }
    setPreviewStatus({ voiceId: null, status: 'idle' });
  };

  const handlePreviewVoice = async (voice: Voice) => {
    if (previewStatus.status === 'playing' && previewStatus.voiceId === voice.id) {
      stopCurrentPreview();
      return;
    }
    stopCurrentPreview();
    setPreviewStatus({ voiceId: voice.id, status: 'loading' });

    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const sampleText = `Hello, this is a preview of my voice.`;
      const audioBase64 = await generateSpeech(currentAi, sampleText, voice.id);
      
      if (!audioBase64 || !audioContextRef.current) {
        throw new Error("Failed to generate preview audio.");
      }

      const decodedChunk = decode(audioBase64);
      const audioBuffer = await decodeAudioData(decodedChunk, audioContextRef.current, 24000, 1);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        setPreviewStatus({ voiceId: null, status: 'idle' });
        audioSourceRef.current = null;
      };
      
      source.start();
      audioSourceRef.current = source;
      setPreviewStatus({ voiceId: voice.id, status: 'playing' });
    } catch (error) {
      console.error('Failed to play voice preview:', error);
      alert(`Could not play preview for ${voice.name}.`);
      setPreviewStatus({ voiceId: null, status: 'idle' });
    }
  };

  const handleSelectVoice = (voice: Voice) => {
    onVoiceChange(voice);
    setIsDropdownOpen(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="language-select" className="block text-sm font-medium text-gray-300 mb-1">
          Translate to:
        </label>
        <select
          id="language-select"
          className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          onChange={handleLanguageSelectChange}
          defaultValue={languages[0].code}
          disabled={isDisabled}
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      <div className="relative" ref={dropdownRef}>
        <label htmlFor="voice-select-button" className="block text-sm font-medium text-gray-300 mb-1">
          AI Voice:
        </label>
        <button
          id="voice-select-button"
          type="button"
          onClick={() => !isDisabled && setIsDropdownOpen(!isDropdownOpen)}
          disabled={isDisabled}
          aria-haspopup="listbox"
          aria-expanded={isDropdownOpen}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 flex justify-between items-center disabled:opacity-50"
        >
          <span>{selectedVoice.name}</span>
          <i className={`fas fa-chevron-down transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}></i>
        </button>
        {isDropdownOpen && (
          <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto animate-fade-in-fast">
            <ul role="listbox">
              {voices.map((voice) => (
                <li 
                  key={voice.id} 
                  className="flex items-center justify-between p-2 hover:bg-purple-900/50 cursor-pointer"
                  onClick={() => handleSelectVoice(voice)}
                  role="option"
                  aria-selected={selectedVoice.id === voice.id}
                >
                  <span>{voice.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviewVoice(voice);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-purple-500/50 text-gray-300 transition-colors"
                    aria-label={`Preview voice ${voice.name}`}
                    disabled={previewStatus.status === 'loading'}
                  >
                    {previewStatus.voiceId === voice.id && previewStatus.status === 'loading' && (
                      <i className="fas fa-spinner fa-spin"></i>
                    )}
                    {previewStatus.voiceId === voice.id && previewStatus.status === 'playing' && (
                      <i className="fas fa-stop"></i>
                    )}
                    {!(previewStatus.voiceId === voice.id && ['loading', 'playing'].includes(previewStatus.status)) && (
                      <i className="fas fa-play"></i>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button
        onClick={onTranslate}
        disabled={isDisabled}
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
      >
        <i className="fas fa-magic"></i>
        Translate Media
      </button>
    </div>
  );
};
