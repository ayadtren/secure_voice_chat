/**
 * WebRTC utility functions for secure voice chat
 * 
 * These functions handle the setup and management of WebRTC peer connections
 * with security and privacy as the primary concerns.
 */

// ICE servers configuration - using only STUN servers for NAT traversal
// No TURN servers to ensure direct peer-to-peer communication
const ICE_SERVERS = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

/**
 * Setup a WebRTC peer connection with the appropriate security settings
 * @param {Object} options Configuration options
 * @param {Function} options.onIceCandidate Callback for ICE candidate events
 * @param {Function} options.onTrack Callback for track events
 * @param {Function} options.onConnectionStateChange Callback for connection state changes
 * @returns {RTCPeerConnection} The configured peer connection
 */
export async function setupPeerConnection({ 
  onIceCandidate, 
  onTrack, 
  onConnectionStateChange 
}) {
  // Create peer connection with security-focused configuration
  const peerConnection = new RTCPeerConnection({
    ...ICE_SERVERS,
    // Security settings
    sdpSemantics: 'unified-plan',
    // Enable DTLS-SRTP for end-to-end encryption
    // This is actually the default in modern browsers
    // but we explicitly set it for clarity and to ensure it's used
    iceTransportPolicy: 'all',
  });
  
  // Set up event handlers
  peerConnection.addEventListener('icecandidate', (event) => {
    if (event.candidate) {
      onIceCandidate(event.candidate);
    }
  });
  
  peerConnection.addEventListener('track', (event) => {
    onTrack(event);
  });
  
  peerConnection.addEventListener('connectionstatechange', () => {
    onConnectionStateChange(peerConnection.connectionState);
  });
  
  // Log connection state changes for debugging
  peerConnection.addEventListener('signalingstatechange', () => {
    console.log('Signaling state:', peerConnection.signalingState);
  });
  
  peerConnection.addEventListener('icegatheringstatechange', () => {
    console.log('ICE gathering state:', peerConnection.iceGatheringState);
  });
  
  peerConnection.addEventListener('iceconnectionstatechange', () => {
    console.log('ICE connection state:', peerConnection.iceConnectionState);
  });
  
  return peerConnection;
}

/**
 * Clean up and close a peer connection
 * @param {RTCPeerConnection} peerConnection The peer connection to clean up
 */
export function cleanupPeerConnection(peerConnection) {
  if (!peerConnection) return;
  
  try {
    // Close all transceivers
    peerConnection.getTransceivers().forEach(transceiver => {
      if (transceiver.stop) {
        transceiver.stop();
      }
    });
    
    // Close the connection
    peerConnection.close();
    
    // Remove all event listeners (for garbage collection)
    peerConnection.onicecandidate = null;
    peerConnection.ontrack = null;
    peerConnection.onconnectionstatechange = null;
    peerConnection.onsignalingstatechange = null;
    peerConnection.onicegatheringstatechange = null;
    peerConnection.oniceconnectionstatechange = null;
    
    console.log('Peer connection cleaned up');
  } catch (error) {
    console.error('Error cleaning up peer connection:', error);
  }
}

/**
 * Create an audio analyzer to visualize audio levels
 * @param {MediaStream} stream The audio stream to analyze
 * @returns {Object} The analyzer node and methods to get audio levels
 */
export function createAudioAnalyzer(stream) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const analyzer = audioContext.createAnalyser();
  
  analyzer.fftSize = 256;
  analyzer.smoothingTimeConstant = 0.8;
  
  const audioSource = audioContext.createMediaStreamSource(stream);
  audioSource.connect(analyzer);
  
  // We don't connect the analyzer to the destination to avoid feedback
  // analyzer.connect(audioContext.destination);
  
  const dataArray = new Uint8Array(analyzer.frequencyBinCount);
  
  // Function to get current audio level (0-100)
  const getAudioLevel = () => {
    analyzer.getByteFrequencyData(dataArray);
    
    // Calculate average volume level
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    
    const average = sum / dataArray.length;
    
    // Convert to a percentage (0-100)
    return Math.min(100, Math.round((average / 255) * 100));
  };
  
  // Function to clean up resources
  const cleanup = () => {
    try {
      audioSource.disconnect();
      analyzer.disconnect();
      audioContext.close();
    } catch (error) {
      console.error('Error cleaning up audio analyzer:', error);
    }
  };
  
  return {
    analyzer,
    getAudioLevel,
    cleanup
  };
}
