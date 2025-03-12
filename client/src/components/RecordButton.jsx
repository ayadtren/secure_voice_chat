import React, { useState } from 'react';
import { clsx } from 'clsx';

/**
 * RecordButton Component
 * 
 * Provides UI for toggling video recording functionality
 */
const RecordButton = ({ 
  isRecording = false, 
  onToggleRecording,
  className = '',
  recordingTime = 0
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Format recording time (seconds to MM:SS)
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <button
      onClick={onToggleRecording}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={clsx(
        className,
        'inline-flex items-center justify-center px-4 py-[calc(--spacing(2)-1px)]',
        'rounded-full border border-transparent shadow-md',
        'text-base font-medium whitespace-nowrap',
        isRecording ? 
          'bg-[#D15052] text-white hover:bg-opacity-90' : 
          'bg-gray-800 text-white hover:bg-gray-700'
      )}
      aria-label={isRecording ? "Stop recording" : "Start recording"}
    >
      {isRecording ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          </svg>
          {formatTime(recordingTime)}
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
          </svg>
          Record
        </>
      )}
      
      {/* Tooltip */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
          {isRecording ? "Stop recording" : "Record this call"}
        </div>
      )}
    </button>
  );
};

export default RecordButton;
