import React, { useState } from 'react';
import { clsx } from 'clsx';

/**
 * ScreenShareButton Component
 * 
 * Provides UI for toggling screen sharing functionality
 */
const ScreenShareButton = ({ 
  isScreenSharing = false, 
  onToggleScreenShare,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      onClick={onToggleScreenShare}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={clsx(
        className,
        'inline-flex items-center justify-center px-4 py-[calc(--spacing(2)-1px)]',
        'rounded-full border border-transparent shadow-md',
        'text-base font-medium whitespace-nowrap',
        isScreenSharing ? 
          'bg-[#4A72F5] text-white hover:bg-opacity-90' : 
          'bg-gray-800 text-white hover:bg-gray-700'
      )}
      aria-label={isScreenSharing ? "Stop screen sharing" : "Share your screen"}
    >
      {isScreenSharing ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
          Stop Sharing
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          Share Screen
        </>
      )}
      
      {/* Tooltip */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
          {isScreenSharing ? "Stop sharing your screen" : "Share your screen with others"}
        </div>
      )}
    </button>
  );
};

export default ScreenShareButton;
