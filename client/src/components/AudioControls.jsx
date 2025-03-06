import React from 'react';
import { Button } from './ui/button';
import NetworkQualityIndicator from './NetworkQualityIndicator';

/**
 * Audio Controls component for managing call actions
 * 
 * @param {Object} props - Component properties
 * @param {boolean} props.muted - Whether audio is muted
 * @param {Function} props.onToggleMute - Function to toggle mute state
 * @param {Function} props.onHangup - Function to hang up call
 * @param {number} props.quality - Network quality (0-100)
 */
const AudioControls = ({ muted = false, onToggleMute, onHangup, quality = 100 }) => {
  return (
    <div className="audio-controls">
      <div className="flex items-center justify-center gap-4">
        <Button
          onClick={onToggleMute}
          variant={muted ? "destructive" : "secondary"}
          className="flex items-center justify-center"
          aria-label={muted ? "Unmute microphone" : "Mute microphone"}
          title={muted ? "Unmute microphone" : "Mute microphone"}
        >
          {muted ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23"></line>
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          )}
          <span className="ml-2">{muted ? "Unmute" : "Mute"}</span>
        </Button>
        
        <Button
          onClick={onHangup}
          variant="destructive"
          className="flex items-center justify-center"
          aria-label="End call"
          title="End call"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 2v4"></path>
            <path d="M8 2v4"></path>
            <path d="M22 9.5c0 6.5-5 12-11.5 12S2 16.5 2 9.5"></path>
            <path d="m17 8-5 5-5-5"></path>
          </svg>
          <span className="ml-2">End Call</span>
        </Button>
      </div>
      
      <div className="network-quality mt-4 flex items-center justify-center">
        <div className="flex items-center">
          <span className="text-sm mr-2">Network Quality:</span>
          <NetworkQualityIndicator quality={quality} />
          <span className="text-sm ml-2">{quality}%</span>
        </div>
      </div>
    </div>
  );
};

export default AudioControls;
