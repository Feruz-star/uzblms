
import React, { useCallback, useState } from 'react';

interface FileUploadProps {
  onFileChange: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
        setIsLoading(true);
        onFileChange(file);
      } else {
        alert('Please upload a valid video or audio file.');
      }
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFile(e.dataTransfer.files);
  }, [onFileChange]);
  
  const handleClick = () => {
    document.getElementById('file-upload-input')?.click();
  };

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg border-gray-600">
             <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-300 text-lg">Loading media...</p>
            </div>
        </div>
    )
  }

  return (
    <div
      className={`flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg transition-colors duration-300 ${
        isDragging ? 'border-purple-500 bg-purple-900/20' : 'border-gray-600 hover:border-purple-500'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <input
        id="file-upload-input"
        type="file"
        accept="video/*,audio/mpeg,audio/mp3"
        onChange={(e) => handleFile(e.target.files)}
        className="hidden"
      />
      <div className="text-center">
        <i className="fas fa-upload fa-3x text-gray-500 mb-4"></i>
        <h2 className="text-xl font-semibold text-gray-300">Drag & Drop Your Video or Audio Here</h2>
        <p className="text-gray-400">or</p>
        <button
          type="button"
          className="mt-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
        >
          Browse Files
        </button>
      </div>
    </div>
  );
};
