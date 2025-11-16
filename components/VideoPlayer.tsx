
import React, { useRef, useEffect, useState } from 'react';
import type { JobStatus } from '../types/index';

interface VideoPlayerProps {
  src: string;
  audioBuffer: AudioBuffer | null;
  audioContext: AudioContext | null;
  status: JobStatus;
  onMetadataLoaded: (duration: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, audioBuffer, audioContext, status, onMetadataLoaded }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

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
        source.start(0, video.currentTime);
        audioSourceRef.current = source;
        setIsPlaying(true);
      }
    };

    const handlePause = () => {
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
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
    
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeked', handleSeek);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeked', handleSeek);
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

  const handleMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    onMetadataLoaded(e.currentTarget.duration);
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
      <video
        ref={videoRef}
        src={src}
        controls
        muted={!!audioBuffer}
        className="w-full h-full"
        onLoadedMetadata={handleMetadata}
        crossOrigin="anonymous"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};
