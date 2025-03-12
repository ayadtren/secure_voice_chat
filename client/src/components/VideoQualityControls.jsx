import React, { useState } from 'react';
import { clsx } from 'clsx';

/**
 * VideoQualityControls Component
 * 
 * Provides controls for video quality settings with Radiant-TS styling
 */
const VideoQualityControls = ({ 
  currentQuality = 'auto',
  onQualityChange,
  className = ''
}) => {
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  
  // Quality presets
  const qualityPresets = [
    { id: 'low', label: 'Low (360p)', width: 640, height: 360, frameRate: 15, bitrate: 400000 },
    { id: 'medium', label: 'Medium (480p)', width: 854, height: 480, frameRate: 24, bitrate: 800000 },
    { id: 'high', label: 'High (720p)', width: 1280, height: 720, frameRate: 30, bitrate: 1500000 },
    { id: 'hd', label: 'HD (1080p)', width: 1920, height: 1080, frameRate: 30, bitrate: 3000000 },
    { id: 'auto', label: 'Auto (Adaptive)', width: null, height: null, frameRate: null, bitrate: null }
  ];
  
  // Get current quality label
  const getCurrentQualityLabel = () => {
    const preset = qualityPresets.find(q => q.id === currentQuality);
    return preset ? preset.label : 'Auto (Adaptive)';
  };
  
  // Toggle quality menu
  const handleQualityMenuToggle = (e) => {
    e.stopPropagation();
    setShowQualityMenu(!showQualityMenu);
  };
  
  // Handle quality selection
  const handleQualitySelect = (quality) => {
    const preset = qualityPresets.find(q => q.id === quality);
    if (preset && onQualityChange) {
      onQualityChange(preset);
    }
    setShowQualityMenu(false);
  };
  
  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setShowQualityMenu(false);
    };
    
    if (showQualityMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showQualityMenu]);
  
  return (
    <div className={clsx(
      className,
      'relative'
    )}>
      <button
        onClick={handleQualityMenuToggle}
        className={clsx(
          'inline-flex items-center justify-center px-3 py-2',
          'rounded-lg border border-gray-700 shadow-sm',
          'text-sm font-medium whitespace-nowrap text-white',
          'bg-gray-800 hover:bg-gray-700 transition-colors'
        )}
        aria-label="Video quality settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2">
          <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 4-2 4-2v-2m-8 0c-1.5 0-2.75-1.06-4-1.06-3 0-4 2-4 2v2m8-10a2 2 0 100-4 2 2 0 000 4z"></path>
          <path d="M15.6 8.5a4 4 0 10-7.2 0"></path>
          <path d="M20 12a8 8 0 10-16 0"></path>
        </svg>
        {getCurrentQualityLabel()}
      </button>
      
      {/* Quality selection menu */}
      {showQualityMenu && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-gray-800 border border-gray-700 z-10">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {qualityPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleQualitySelect(preset.id)}
                className={clsx(
                  "block w-full text-left px-4 py-2 text-sm",
                  currentQuality === preset.id 
                    ? "bg-gray-700 text-white font-medium" 
                    : "text-gray-300 hover:bg-gray-700"
                )}
                role="menuitem"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoQualityControls;
