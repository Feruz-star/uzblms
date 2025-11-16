
import React from 'react';

interface TranslationResultProps {
  transcription: string;
  translation: string;
  onDownloadAudio: () => void;
}

export const TranslationResult: React.FC<TranslationResultProps> = ({ transcription, translation, onDownloadAudio }) => {
  return (
    <div className="mt-4 space-y-4 animate-fade-in">
      <div className="bg-gray-700/50 p-4 rounded-lg">
        <h3 className="font-bold text-lg mb-2 text-purple-300">Original Transcription</h3>
        <p className="text-gray-300 max-h-24 overflow-y-auto">{transcription}</p>
      </div>
      <div className="bg-gray-700/50 p-4 rounded-lg">
        <h3 className="font-bold text-lg mb-2 text-indigo-300">Translated Text</h3>
        <p className="text-gray-300 max-h-24 overflow-y-auto">{translation}</p>
      </div>
      <div className="mt-4">
        <button 
          onClick={onDownloadAudio}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2">
            <i className="fas fa-download"></i> Download Audio (.wav)
        </button>
      </div>
    </div>
  );
};
