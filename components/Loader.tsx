
import React from 'react';

interface LoaderProps {
  message: string;
  progress: number;
}

export const Loader: React.FC<LoaderProps> = ({ message, progress }) => {
  return (
    <div className="w-full p-4 bg-gray-700/50 rounded-lg">
        <div className="flex justify-between mb-1">
            <span className="text-base font-medium text-gray-300">{message}</span>
            <span className="text-sm font-medium text-gray-300">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-600 rounded-full h-2.5">
            <div 
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
            ></div>
        </div>
    </div>
  );
};
