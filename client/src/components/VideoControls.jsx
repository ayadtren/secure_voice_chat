import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';

/**
 * VideoControls Component
 * 
 * Provides controls for video chat functionality with Radiant-TS styling
 */
const VideoControls = ({ 
  isVideoEnabled = false,
  onToggleVideo,
  onSwitchCamera,
  videoDevices = [],
  className = ''
}) => {
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDeviceMenu(false);
    };
    
    if (showDeviceMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showDeviceMenu]);
  
  // Handle device menu toggle
  const handleDeviceMenuToggle = (e) => {
    e.stopPropagation();
    setShowDeviceMenu(!showDeviceMenu);
  };
  
  // Handle camera selection
  const handleCameraSelect = (deviceId) => {
    onSwitchCamera(deviceId);
    setShowDeviceMenu(false);
  };
  
  return (
    <div className={clsx(
      className,
      'flex items-center justify-center space-x-2'
    )}>
      {/* Camera toggle button */}
      <button
        onClick={onToggleVideo}
        className={clsx(
          'inline-flex items-center justify-center px-4 py-[calc(--spacing(2)-1px)]',
          'rounded-full border border-transparent shadow-md',
          'text-base font-medium whitespace-nowrap',
          isVideoEnabled ? 
            'bg-gray-950 text-white data-hover:bg-gray-800' : 
            'bg-white/15 ring-1 ring-[#D15052]/15 text-gray-950 data-hover:bg-white/20',
          'after:absolute after:inset-0 after:rounded-full after:shadow-[inset_0_0_2px_1px_#ffffff4d]'
        )}
        aria-label={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
      >
        {isVideoEnabled ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2">
              <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
            Stop Video
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2">
              <polygon points="23 7 16 12 23 17 23 7"></polygon>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
            Start Video
          </>
        )}
      </button>
      
      {/* Camera selection button (only shown when video is enabled and multiple devices are available) */}
      {isVideoEnabled && videoDevices.length > 1 && (
        <div className="relative">
          <button
            onClick={handleDeviceMenuToggle}
            className={clsx(
              'inline-flex items-center justify-center px-2 py-[calc(--spacing(1.5)-1px)]',
              'rounded-lg border border-transparent ring-1 shadow-sm ring-black/10',
              'text-sm font-medium whitespace-nowrap text-gray-950',
              'data-hover:bg-gray-50'
            )}
            aria-label="Switch camera"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2">
              <path d="M15 10h4.5a2.5 2.5 0 0 1 0 5H16"></path>
              <path d="M9 14h-4.5a2.5 2.5 0 0 1 0-5H8"></path>
              <line x1="9" y1="10" x2="15" y2="10"></line>
              <line x1="9" y1="14" x2="15" y2="14"></line>
            </svg>
            Switch Camera
          </button>
          
          {/* Device selection menu */}
          {showDeviceMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
              <div className="py-1" role="menu" aria-orientation="vertical">
                {videoDevices.map((device) => (
                  <button
                    key={device.deviceId}
                    onClick={() => handleCameraSelect(device.deviceId)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                  >
                    {device.label || `Camera ${device.deviceId.substring(0, 5)}...`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoControls;
