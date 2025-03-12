import React, { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import NetworkQualityIndicator from './NetworkQualityIndicator';

/**
 * VideoContainer Component
 * 
 * Displays a video stream with Radiant-TS styling
 */
const VideoContainer = ({ 
  stream, 
  isMuted = false, 
  isLocal = false, 
  displayName = '', 
  isSpeaking = false,
  isVideoEnabled = true,
  connectionQuality = 100, 
  className = ''
}) => {
  const videoRef = useRef(null);
  
  // Connect stream to video element when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
    
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);
  
  return (
    <div 
      className={clsx(
        className,
        'relative rounded-2xl overflow-hidden shadow-lg',
        'bg-gray-800',
        'border border-gray-700',
        isSpeaking && 'ring-2 ring-[#D15052]',
        'after:absolute after:inset-0 after:rounded-2xl after:shadow-[inset_0_0_2px_1px_#ffffff1a]'
      )}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal || isMuted}
        className={clsx(
          'w-full h-full object-cover',
          !isVideoEnabled && 'hidden'
        )}
      />
      
      {/* Placeholder when video is disabled */}
      {!isVideoEnabled && (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center border border-gray-600 shadow-inner">
            <span className="text-3xl text-white font-medium">
              {displayName.substring(0, 2).toUpperCase()}
            </span>
          </div>
        </div>
      )}
      
      {/* User info overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-white font-medium truncate text-sm">
              {isLocal ? 'You' : displayName}
            </span>
            
            {/* Speaking indicator */}
            {isSpeaking && (
              <div className="w-2 h-2 rounded-full bg-[#D15052] animate-pulse" />
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Network quality indicator */}
            <NetworkQualityIndicator quality={connectionQuality} />
            
            {/* Muted indicator */}
            {isMuted && (
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#D15052] shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white">
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoContainer;
