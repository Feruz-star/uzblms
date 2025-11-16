
import React, { useRef, useEffect, useState } from 'react';
import type { JobStatus } from '../types/index';

interface AudioPlayerProps {
  src: string;
  fileName: string;
  audioBuffer: AudioBuffer | null;
  audioContext: AudioContext | null;
  status: JobStatus;
  onMetadataLoaded: (duration: number) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, fileName, audioBuffer, audioContext, status, onMetadataLoaded }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      if (audioContext && audioBuffer) {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        if (audioSourceRef.current) {
          audioSourceRef.current.stop();
        }
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0, audio.currentTime);
        audioSourceRef.current = source;
        setIsPlaying(true);
      }
    };

    const handlePause = () => {
      if (audioSourceRef.current) {
        try {
            audioSourceRef.current.stop();
        } catch(e) {
            // may already be stopped
        }
        audioSourceRef.current = null;
      }
       setIsPlaying(false);
    };

    const handleSeek = () => {
       if(isPlaying) {
         handlePause();
         handlePlay();
       }
    };
    
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('seeked', handleSeek);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('seeked', handleSeek);
      if (audioSourceRef.current) {
        try {
            audioSourceRef.current.stop();
        } catch(e) {
            // may already be stopped
        }
        audioSourceRef.current = null;
      }
    };
  }, [audioBuffer, audioContext, isPlaying]);

  const handleMetadata = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    onMetadataLoaded(e.currentTarget.duration);
  }

  return (
    <div className="relative w-full aspect-video bg-gray-800 rounded-lg overflow-hidden shadow-lg flex flex-col items-center justify-center p-4">
        <div className="text-center text-gray-400">
            <i className="fas fa-music fa-5x mb-4"></i>
            <p className="font-semibold text-lg truncate max-w-full px-4">{fileName}</p>
        </div>
        <audio
        ref={audioRef}
        src={src}
        controls
        muted={!!audioBuffer}
        className="w-full absolute bottom-4 left-0 right-0 px-4"
        onLoadedMetadata={handleMetadata}
        crossOrigin="anonymous"
        >
        Your browser does not support the audio element.
      </audio>
    </div>
  );
};
