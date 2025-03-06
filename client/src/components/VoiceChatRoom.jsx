import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { WebRTCManager } from '../utils/webrtcManager';
import { Button } from './ui/button';
import QRCodeGenerator from './QRCodeGenerator';
import { cn } from '../lib/utils';

/**
 * VoiceChatRoom Component
 * 
 * Main component for the voice chat room functionality.
 * Handles WebRTC connections, audio processing, and UI for the voice chat.
 */
const VoiceChatRoom = ({ roomId, userId, onLeave }) => {
  const [socket, setSocket] = useState(null);
  const [webrtcManager, setWebrtcManager] = useState(null);
  const [connectedPeers, setConnectedPeers] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [peerSpeaking, setPeerSpeaking] = useState({});
  const [audioLevels, setAudioLevels] = useState({});
  const [connectionQualities, setConnectionQualities] = useState({});
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [showQRCode, setShowQRCode] = useState(false);
  
  // References
  const audioRefs = useRef({});
  const animationFrameRef = useRef(null);
  
  // Initialize socket and WebRTC manager
  useEffect(() => {
    // Create socket connection to signaling server
    const newSocket = io(process.env.REACT_APP_SIGNALING_SERVER || window.location.origin, {
      path: '/socket.io',
      transports: ['websocket'],
      secure: window.location.protocol === 'https:',
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    setSocket(newSocket);
    
    // Socket event handlers
    newSocket.on('connect', () => {
      console.log('Connected to signaling server');
    });
    
    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('Failed to connect to the signaling server. Please try again.');
    });
    
    // Clean up on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      newSocket.disconnect();
    };
  }, []);
  
  // Initialize WebRTC manager when socket is ready
  useEffect(() => {
    if (!socket || !roomId) return;
    
    const manager = new WebRTCManager(socket, {
      userId,
      onPeerConnect: handlePeerConnect,
      onPeerDisconnect: handlePeerDisconnect,
      onSpeakingChange: handleSpeakingChange,
      onAudioQualityChange: handleAudioQualityChange,
      onError: (errorMsg) => setError(errorMsg),
    });
    
    setWebrtcManager(manager);
    
    // Initialize WebRTC and join room
    manager.initialize(roomId)
      .then(() => {
        setIsConnecting(false);
        startAudioLevelMonitoring(manager);
      })
      .catch((err) => {
        console.error('Failed to initialize WebRTC:', err);
        setError('Failed to access microphone. Please check your permissions.');
        setIsConnecting(false);
      });
    
    // Clean up on unmount
    return () => {
      if (manager) {
        manager.dispose();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [socket, roomId, userId]);
  
  // Handle peer connection
  const handlePeerConnect = (peerId, stream) => {
    console.log(`Peer connected: ${peerId}`);
    
    // Add to connected peers
    setConnectedPeers((prevPeers) => {
      if (!prevPeers.includes(peerId)) {
        return [...prevPeers, peerId];
      }
      return prevPeers;
    });
    
    // Create audio element for peer
    if (stream) {
      const audioElement = new Audio();
      audioElement.srcObject = stream;
      audioElement.autoplay = true;
      
      // Store audio element reference
      audioRefs.current[peerId] = audioElement;
      
      // Start playing
      audioElement.play().catch((err) => {
        console.error('Error playing audio:', err);
      });
    }
  };
  
  // Handle peer disconnection
  const handlePeerDisconnect = (peerId) => {
    console.log(`Peer disconnected: ${peerId}`);
    
    // Remove from connected peers
    setConnectedPeers((prevPeers) => prevPeers.filter((id) => id !== peerId));
    
    // Remove speaking status
    setPeerSpeaking((prevState) => {
      const newState = { ...prevState };
      delete newState[peerId];
      return newState;
    });
    
    // Remove audio levels
    setAudioLevels((prevLevels) => {
      const newLevels = { ...prevLevels };
      delete newLevels[peerId];
      return newLevels;
    });
    
    // Remove connection quality
    setConnectionQualities((prevQualities) => {
      const newQualities = { ...prevQualities };
      delete newQualities[peerId];
      return newQualities;
    });
    
    // Clean up audio element
    if (audioRefs.current[peerId]) {
      audioRefs.current[peerId].srcObject = null;
      delete audioRefs.current[peerId];
    }
  };
  
  // Handle speaking change
  const handleSpeakingChange = (speaking, peerId) => {
    if (peerId) {
      // Peer speaking change
      setPeerSpeaking((prevState) => ({
        ...prevState,
        [peerId]: speaking,
      }));
    } else {
      // Local speaking change
      setIsSpeaking(speaking);
    }
  };
  
  // Handle audio quality change
  const handleAudioQualityChange = (peerId, quality, metrics) => {
    setConnectionQualities((prevQualities) => ({
      ...prevQualities,
      [peerId]: { quality, metrics },
    }));
  };
  
  // Start monitoring audio levels
  const startAudioLevelMonitoring = (manager) => {
    const updateAudioLevels = () => {
      if (!manager) return;
      
      // Update local audio level
      const localLevel = manager.getAudioLevel();
      
      setAudioLevels((prevLevels) => ({
        ...prevLevels,
        local: localLevel,
      }));
      
      // Continue monitoring
      animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
    };
    
    // Start monitoring
    updateAudioLevels();
  };
  
  // Toggle mute
  const handleToggleMute = () => {
    if (webrtcManager) {
      const newMuteState = !isMuted;
      webrtcManager.setMuted(newMuteState);
      setIsMuted(newMuteState);
    }
  };
  
  // Leave room
  const handleLeaveRoom = () => {
    if (webrtcManager) {
      webrtcManager.leaveRoom();
    }
    
    if (onLeave) {
      onLeave();
    }
  };
  
  // Toggle QR code display
  const handleToggleQRCode = () => {
    setShowQRCode((prev) => !prev);
  };
  
  // Generate connection data for QR code
  const getConnectionData = () => {
    return JSON.stringify({
      roomId,
      server: window.location.origin,
    });
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-medium">Room: {roomId}</h2>
          <div className="text-sm text-muted-foreground">
            {connectedPeers.length} {connectedPeers.length === 1 ? 'peer' : 'peers'} connected
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleQRCode}
            aria-label={showQRCode ? "Hide QR code" : "Show QR code for connection"}
          >
            {showQRCode ? "Hide QR" : "Show QR"}
          </Button>
          
          <Button
            variant={isMuted ? "default" : "outline"}
            size="sm"
            onClick={handleToggleMute}
            aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isMuted ? "Unmute" : "Mute"}
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={handleLeaveRoom}
            aria-label="Leave voice chat room"
          >
            Leave
          </Button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 p-4 overflow-auto">
        {isConnecting ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-lg font-medium mb-2">Connecting...</div>
            <div className="text-sm text-muted-foreground">
              Setting up secure voice connection
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-lg font-medium text-destructive mb-2">Error</div>
            <div className="text-sm text-muted-foreground mb-4">{error}</div>
            <Button onClick={handleLeaveRoom}>Go Back</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* QR Code */}
            {showQRCode && (
              <div className="col-span-1 md:col-span-2">
                <QRCodeGenerator
                  connectionData={getConnectionData()}
                  className="mx-auto max-w-xs"
                />
              </div>
            )}
            
            {/* Local user */}
            <div className={cn(
              "flex flex-col items-center p-4 rounded-lg border border-border",
              isSpeaking && "border-primary"
            )}>
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-2">
                <span className="text-xl text-primary-foreground font-medium">
                  {userId.substring(0, 2).toUpperCase()}
                </span>
              </div>
              
              <div className="text-lg font-medium mb-1">You</div>
              
              <div className="flex items-center space-x-2 mb-2">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  isSpeaking ? "bg-green-500" : "bg-muted"
                )} />
                <span className="text-sm text-muted-foreground">
                  {isMuted ? "Muted" : isSpeaking ? "Speaking" : "Not speaking"}
                </span>
              </div>
              
              {/* Audio level indicator */}
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${audioLevels.local || 0}%` }}
                />
              </div>
            </div>
            
            {/* Connected peers */}
            {connectedPeers.map((peerId) => (
              <div
                key={peerId}
                className={cn(
                  "flex flex-col items-center p-4 rounded-lg border border-border",
                  peerSpeaking[peerId] && "border-primary"
                )}
              >
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-2">
                  <span className="text-xl text-secondary-foreground font-medium">
                    {peerId.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                
                <div className="text-lg font-medium mb-1">
                  {peerId.substring(0, 8)}
                </div>
                
                <div className="flex items-center space-x-2 mb-2">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    peerSpeaking[peerId] ? "bg-green-500" : "bg-muted"
                  )} />
                  <span className="text-sm text-muted-foreground">
                    {peerSpeaking[peerId] ? "Speaking" : "Not speaking"}
                  </span>
                </div>
                
                {/* Connection quality indicator */}
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs text-muted-foreground">
                    {connectionQualities[peerId]?.quality || 'unknown'}
                  </span>
                </div>
              </div>
            ))}
            
            {connectedPeers.length === 0 && !showQRCode && (
              <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center p-8 border border-dashed border-border rounded-lg">
                <div className="text-lg font-medium mb-2">No one else is here</div>
                <div className="text-sm text-muted-foreground mb-4">
                  Share the QR code or room ID to invite others
                </div>
                <Button onClick={handleToggleQRCode}>
                  Show QR Code
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceChatRoom;
