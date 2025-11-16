
import React, { useState, useCallback, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';

import { FileUpload } from './components/FileUpload';
import { VideoPlayer } from './components/VideoPlayer';
import { AudioPlayer } from './components/AudioPlayer';
import { TranslationControls } from './components/TranslationControls';
import { Loader } from './components/Loader';
import { TranslationResult } from './components/TranslationResult';
import { languages } from './constants/languages';
import { voices } from './constants/voices';
import { transcribeMedia, translateText, generateSpeech } from './services/geminiService';
import { downloadFile } from './utils/fileUtils';
import { decode, decodeAudioData, concatenateAudioBuffers } from './utils/audioUtils';
import type { Language, JobStatus, Voice } from './types/index';

const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [fileType, setFileType] = useState<'video' | 'audio' | null>(null);
  const [mediaDuration, setMediaDuration] = useState<number>(0);
  const [targetLanguage, setTargetLanguage] = useState<Language>(languages[0]);
  const [selectedVoice, setSelectedVoice] = useState<Voice>(voices[0]);
  const [jobStatus, setJobStatus] = useState<JobStatus>('IDLE');
  const [statusMessage, setStatusMessage] = useState('');
  const [transcription, setTranscription] = useState('');
  const [translation, setTranslation] = useState('');
  const [translatedAudio, setTranslatedAudio] = useState<AudioBuffer | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [progress, setProgress] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);

  const handleFileChange = (file: File) => {
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    resetState(false);

    if (file.type.startsWith('video/')) {
        setFileType('video');
    } else if (file.type.startsWith('audio/')) {
        setFileType('audio');
    }

    setJobStatus('UPLOADED');
  };

  const resetState = (fullReset: boolean) => {
    setErrorMessage('');
    setTranscription('');
    setTranslation('');
    setTranslatedAudio(null);
    setStatusMessage('');
    setProgress(0);
    if (fullReset) {
      setVideoFile(null);
      setMediaUrl('');
      setMediaDuration(0);
      setFileType(null);
      setJobStatus('IDLE');
    }
  };

  const fileToGenerativePart = async (file: File): Promise<{ mimeType: string, data: string }> => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      mimeType: file.type,
      data: await base64EncodedDataPromise,
    };
  }

  const handleTranslate = useCallback(async () => {
    if (!videoFile || !targetLanguage || mediaDuration === 0) {
      if (mediaDuration === 0) {
        setErrorMessage("Could not determine media duration. Please try a different file.");
      }
      return;
    }

    resetState(false);
    setJobStatus('PROCESSING');
    
    try {
      if (!audioContextRef.current) {
         audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      setStatusMessage('Step 1/3: Transcribing audio...');
      setProgress(10);
      const mediaPart = await fileToGenerativePart(videoFile);
      
      const transcribedText = await transcribeMedia(currentAi, mediaPart);
      setTranscription(transcribedText);
      setProgress(40);
      
      setStatusMessage('Step 2/3: Translating text...');
      const translatedText = await translateText(currentAi, transcribedText, targetLanguage.name);
      setTranslation(translatedText);
      setProgress(70);

      setStatusMessage('Step 3/3: Generating speech...');
      if (!translatedText.trim()) {
        setTranslatedAudio(null);
      } else {
        const sentences = translatedText.match(/\s*[^.!?]+[.!?]*/g) || [];
        const audioPromises = sentences.map(sentence => generateSpeech(currentAi, sentence.trim(), selectedVoice.id));
        const audioBase64Chunks = await Promise.all(audioPromises);
        
        const audioContext = audioContextRef.current;
        const bufferPromises = audioBase64Chunks
          .filter(chunk => chunk)
          .map(chunk => decode(chunk))
          .map(decodedChunk => decodeAudioData(decodedChunk, audioContext, 24000, 1));
        const audioBuffers = await Promise.all(bufferPromises);
        
        if (audioBuffers.length > 0) {
            const concatenatedBuffer = concatenateAudioBuffers(audioContext, audioBuffers);
            setTranslatedAudio(concatenatedBuffer);
        } else {
            setTranslatedAudio(null);
        }
      }
      setProgress(100);

      setStatusMessage('Translation complete!');
      setJobStatus('COMPLETE');
    } catch (error) {
      console.error('Translation process failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
      setJobStatus('ERROR');
      setProgress(0);
    }
  }, [videoFile, targetLanguage, mediaDuration, selectedVoice]);

  const handleDownloadAudio = () => {
    if (!translatedAudio) return;
    const wavBlob = bufferToWave(translatedAudio);
    downloadFile(wavBlob, `translated_audio_${targetLanguage.code}.wav`, 'audio/wav');
  };

  const bufferToWave = (abuffer: AudioBuffer): Blob => {
    const numOfChan = abuffer.numberOfChannels;
    const length = abuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    setUint32(0x46464952); 
    setUint32(length - 8); 
    setUint32(0x45564157); 

    setUint32(0x20746d66); 
    setUint32(16); 
    setUint16(1); 
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); 
    setUint16(numOfChan * 2); 
    setUint16(16); 
    setUint32(0x61746164); 
    setUint32(length - pos - 4); 

    for (i = 0; i < abuffer.numberOfChannels; i++)
      channels.push(abuffer.getChannelData(i));

    while (pos < length) {
      for (i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset])); 
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; 
        view.setInt16(pos, sample, true); 
        pos += 2;
      }
      offset++;
    }

    return new Blob([view], { type: 'audio/wav' });

    function setUint16(data: number) {
      view.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data: number) {
      view.setUint32(pos, data, true);
      pos += 4;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans">
      <header className="w-full max-w-5xl text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
          AI Media Translator
        </h1>
        <p className="mt-2 text-lg text-gray-400">
          Upload a video or audio file, select a language, and let AI do the rest.
        </p>
      </header>

      <main className="w-full max-w-5xl bg-gray-800/50 rounded-2xl shadow-2xl p-6 backdrop-blur-sm border border-gray-700">
        {jobStatus === 'IDLE' && <FileUpload onFileChange={handleFileChange} />}
        
        {mediaUrl && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="w-full">
               {fileType === 'video' ? (
                <VideoPlayer
                    src={mediaUrl}
                    audioBuffer={translatedAudio}
                    audioContext={audioContextRef.current}
                    status={jobStatus}
                    onMetadataLoaded={setMediaDuration}
                />
              ) : fileType === 'audio' ? (
                <AudioPlayer
                    src={mediaUrl}
                    fileName={videoFile?.name || 'Audio File'}
                    audioBuffer={translatedAudio}
                    audioContext={audioContextRef.current}
                    status={jobStatus}
                    onMetadataLoaded={setMediaDuration}
                />
              ) : null}
            </div>
            
            <div className="flex flex-col justify-between">
              <div>
                <TranslationControls
                  onLanguageChange={setTargetLanguage}
                  onTranslate={handleTranslate}
                  isDisabled={jobStatus === 'PROCESSING'}
                  onVoiceChange={setSelectedVoice}
                  selectedVoice={selectedVoice}
                />

                {jobStatus === 'PROCESSING' && (
                  <div className="mt-4">
                    <Loader message={statusMessage} progress={progress} />
                  </div>
                )}

                {errorMessage && (
                  <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
                    <p className="font-bold">An error occurred:</p>
                    <p>{errorMessage}</p>
                  </div>
                )}
                
                {jobStatus === 'COMPLETE' && (
                  <TranslationResult
                    transcription={transcription}
                    translation={translation}
                    onDownloadAudio={handleDownloadAudio}
                  />
                )}
              </div>

              {jobStatus !== 'IDLE' && jobStatus !== 'PROCESSING' && (
                 <button
                    onClick={() => resetState(true)}
                    className="mt-6 w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                   <i className="fas fa-undo"></i>
                    Start Over
                  </button>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="w-full max-w-5xl text-center mt-8 text-gray-500 text-sm">
        <p>Powered by Gemini. Built with React & Tailwind CSS.</p>
      </footer>
    </div>
  );
};

export default App;
