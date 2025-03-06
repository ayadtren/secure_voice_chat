import React from 'react';

/**
 * ConnectionStatus component displays the current connection state
 * and call status, as well as network quality indicators
 */
function ConnectionStatus({ connected, callStatus, currentCall, networkQuality, isSpeaking, peerSpeaking }) {
  // Determine status text based on connection and call state
  let statusText = connected ? 'Connected to server' : 'Disconnected from server';
  
  if (connected && callStatus === 'calling') {
    statusText = `Calling ${currentCall?.username}...`;
  } else if (connected && callStatus === 'connected') {
    statusText = `In call with ${currentCall?.username}`;
  }
  
  // Determine quality color based on network quality
  let qualityColor = '#4caf50'; // Good (green)
  
  if (networkQuality < 50) {
    qualityColor = '#f44336'; // Poor (red)
  } else if (networkQuality < 80) {
    qualityColor = '#ff9800'; // Fair (orange)
  }
  
  return (
    <div className="connection-status">
      <div 
        className={`status-indicator ${connected ? 'status-connected' : 'status-disconnected'}`}
        title={connected ? 'Connected' : 'Disconnected'}
        aria-hidden="true"
      />
      
      <span>{statusText}</span>
      
      {callStatus === 'connected' && (
        <>
          <div className="network-quality" title={`Network quality: ${networkQuality}%`}>
            <span>Quality:</span>
            <div className="quality-indicator">
              <div 
                className="quality-bar" 
                style={{ 
                  width: `${networkQuality}%`,
                  backgroundColor: qualityColor
                }}
                aria-label={`Network quality: ${networkQuality}%`}
              />
            </div>
          </div>
          
          {isSpeaking && (
            <div className="status-speaking you" title="You are speaking">
              <span className="speaking-dot"></span>
            </div>
          )}
          
          {peerSpeaking && (
            <div className="status-speaking peer" title={`${currentCall?.username} is speaking`}>
              <span className="speaking-dot peer"></span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ConnectionStatus;
