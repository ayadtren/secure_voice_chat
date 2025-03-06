import React from 'react';

/**
 * AudioControls component provides buttons for controlling
 * the microphone and ending calls
 */
function AudioControls({ audioEnabled, onToggleMicrophone, onEndCall }) {
  return (
    <div className="audio-controls">
      <button 
        className={`control-button mic-button ${!audioEnabled ? 'muted' : ''}`}
        onClick={onToggleMicrophone}
        aria-label={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
        title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {audioEnabled ? '🎙️' : '🔇'}
      </button>
      
      <button 
        className="control-button end-call-button"
        onClick={onEndCall}
        aria-label="End call"
        title="End call"
      >
        📞
      </button>
    </div>
  );
}

export default AudioControls;
