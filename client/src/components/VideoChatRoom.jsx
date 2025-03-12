import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { WebRTCManager } from '../utils/webrtcManager';
import { clsx } from 'clsx';
import { cn } from '../lib/utils';
import QRCodeGenerator from './QRCodeGenerator';
import VideoContainer from './VideoContainer';
import VideoControls from './VideoControls';
import CameraPermissionGuide from './CameraPermissionGuide';
import VideoQualityControls from './VideoQualityControls';
import NetworkQualityIndicator from './NetworkQualityIndicator';
import ScreenShareButton from './ScreenShareButton';
import RecordButton from './RecordButton';
import RecordingHelper from './../utils/recordingHelper';
import { getOptimalLayout, addOrientationChangeListener } from './../utils/responsiveHelper';
import { cleanupWebRTCResources, cleanupRecordingResources } from './../utils/resourceCleanupHelper';

/**
 * VideoChatRoom Component
 * 
 * Main component for the video/voice chat room functionality.
 * Handles WebRTC connections, audio/video processing, and UI for the chat.
 */
const VideoChatRoom = ({ roomId, userId, onLeave }) => {
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
  
  // Video-related state
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [videoDevices, setVideoDevices] = useState([]);
  const [cameraStatus, setCameraStatus] = useState(null);
  const [localVideoStream, setLocalVideoStream] = useState(null);
  const [remoteVideoStreams, setRemoteVideoStreams] = useState({});
  
  // Phase 2 features - Video quality and network monitoring
  const [currentVideoQuality, setCurrentVideoQuality] = useState('high');
  const [networkQuality, setNetworkQuality] = useState(100);
  const [networkMetrics, setNetworkMetrics] = useState(null);
  
  // Phase 3 features - Screen sharing
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  
  // Phase 3 features - Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  // Layout state for responsive design
  const [layout, setLayout] = useState(getOptimalLayout());
  
  // References
  const audioRefs = useRef({});
  const animationFrameRef = useRef(null);
  const webrtcManagerRef = useRef(null);
  const recordingHelperRef = useRef(null);
  
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

  // Handle device orientation changes
  useEffect(() => {
    const removeListener = addOrientationChangeListener(() => {
      setLayout(getOptimalLayout());
    });
    
    return () => {
      removeListener();
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
      onMicrophoneStatus: handleMicrophoneStatus,
      onCameraStatus: handleCameraStatus,
      onLocalVideo: handleLocalVideo,
      onRemoteVideo: handleRemoteVideo,
      onVideoStatusChange: handleVideoStatusChange,
      onNetworkQualityChange: handleNetworkQualityChange, // Phase 2 - Network quality monitoring
      onScreenSharingChange: handleScreenSharingChange, // Phase 3 - Screen sharing
    });
    
    setWebrtcManager(manager);
    webrtcManagerRef.current = manager;
    
    // Initialize WebRTC and join room
    manager.initialize(roomId)
      .then(() => {
        setIsConnecting(false);
        startAudioLevelMonitoring(manager);
        
        // Get available video devices
        manager.getVideoDevices().then(devices => {
          setVideoDevices(devices);
        });
        
        // Set initial video quality (Phase 2)
        if (manager.setVideoQuality) {
          manager.setVideoQuality(currentVideoQuality);
        }
        
        // Initialize recording helper (Phase 3)
        recordingHelperRef.current = new RecordingHelper();
      })
      .catch((err) => {
        console.error('Failed to initialize WebRTC:', err);
        setError('Failed to initialize video chat. Please try again.');
      });
    
    // Clean up on unmount
    return () => {
      if (manager) {
        manager.dispose();
      }
    };
  }, [socket, roomId, userId, currentVideoQuality]);
  
  // Handle peer connect
  const handlePeerConnect = (peerId) => {
    setConnectedPeers(prev => [...prev, peerId]);
  };
  
  // Handle peer disconnect
  const handlePeerDisconnect = (peerId) => {
    setConnectedPeers(prev => prev.filter(id => id !== peerId));
    
    // Remove peer speaking status
    setPeerSpeaking(prev => {
      const newState = { ...prev };
      delete newState[peerId];
      return newState;
    });
    
    // Remove peer audio level
    setAudioLevels(prev => {
      const newState = { ...prev };
      delete newState[peerId];
      return newState;
    });
    
    // Remove peer video stream
    setRemoteVideoStreams(prev => {
      const newState = { ...prev };
      delete newState[peerId];
      return newState;
    });
    
    // Remove peer connection quality
    setConnectionQualities(prev => {
      const newState = { ...prev };
      delete newState[peerId];
      return newState;
    });
  };
  
  // Handle speaking change
  const handleSpeakingChange = (speaking) => {
    setIsSpeaking(speaking);
  };
  
  // Handle peer speaking change
  const handlePeerSpeakingChange = (peerId, speaking) => {
    setPeerSpeaking(prev => ({
      ...prev,
      [peerId]: speaking,
    }));
  };
  
  // Handle audio quality change
  const handleAudioQualityChange = (quality) => {
    // Update audio quality
  };
  
  // Handle microphone status
  const handleMicrophoneStatus = (status) => {
    // Update microphone status
  };
  
  // Handle camera status
  const handleCameraStatus = (status) => {
    setCameraStatus(status);
  };
  
  // Handle local video
  const handleLocalVideo = (stream) => {
    setLocalVideoStream(stream);
    setIsVideoEnabled(!!stream);
  };
  
  // Handle remote video
  const handleRemoteVideo = (peerId, stream) => {
    setRemoteVideoStreams(prev => ({
      ...prev,
      [peerId]: stream,
    }));
  };
  
  // Handle video status change
  const handleVideoStatusChange = (enabled) => {
    setIsVideoEnabled(enabled);
  };
  
  // Handle network quality change (Phase 2)
  const handleNetworkQualityChange = (quality, metrics) => {
    setNetworkQuality(quality);
    setNetworkMetrics(metrics);
    
    // Update connection quality for the peer
    setConnectionQualities(prev => ({
      ...prev,
      local: quality,
    }));
  };
  
  // Handle video quality change (Phase 2)
  const handleVideoQualityChange = (qualityPreset) => {
    if (webrtcManager && webrtcManager.setVideoQuality) {
      webrtcManager.setVideoQuality(qualityPreset.id);
      setCurrentVideoQuality(qualityPreset.id);
    }
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
      const newMuteState = webrtcManager.toggleMute();
      setIsMuted(newMuteState);
    }
  };
  
  // Toggle video
  const handleToggleVideo = async () => {
    if (webrtcManager) {
      const videoEnabled = await webrtcManager.toggleVideo();
      setIsVideoEnabled(videoEnabled);
    }
  };
  
  // Switch camera
  const handleSwitchCamera = async (deviceId) => {
    if (webrtcManager) {
      await webrtcManager.switchCamera(deviceId);
    }
  };
  
  // Retry camera access
  const handleRetryCameraAccess = async () => {
    if (webrtcManager) {
      const videoEnabled = await webrtcManager.toggleVideo();
      setIsVideoEnabled(videoEnabled);
    }
  };
  
  // Leave room
  const handleLeaveRoom = () => {
    // Clean up WebRTC resources
    if (webrtcManagerRef.current) {
      cleanupWebRTCResources(webrtcManagerRef.current);
    }
    
    // Clean up recording resources
    if (recordingHelperRef.current) {
      cleanupRecordingResources(recordingHelperRef.current);
    }

    // Stop recording if active
    if (recordingHelperRef.current && recordingHelperRef.current.isCurrentlyRecording()) {
      recordingHelperRef.current.stopRecording().catch(console.error);
      setIsRecording(false);
      setRecordingTime(0);
    }
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
  
  // Calculate grid columns based on number of participants
  const getGridColumns = () => {
    // Use layout for responsive grid
    if (layout.videoLayout === 'stack') {
      return 'grid-cols-1';
    }
    
    const totalVideos = (isVideoEnabled ? 1 : 0) + Object.keys(remoteVideoStreams).length;
    
    if (totalVideos <= 1) {
      return 'grid-cols-1';
    } else if (totalVideos <= 2) {
      return 'grid-cols-2';
    } else if (totalVideos <= 4) {
      return 'grid-cols-2';
    } else {
      return 'grid-cols-3';
    }
  };
  
  // Handle screen sharing change (Phase 3)
  const handleScreenSharingChange = (isSharing, stream) => {
    setIsScreenSharing(isSharing);
    setScreenStream(stream);
  };

  // Handle toggle screen sharing
  const handleToggleScreenShare = async () => {
    if (webrtcManager) {
      await webrtcManager.toggleScreenSharing();
    }
  };

  // Handle recording time update
  const handleRecordingTimeUpdate = (time) => {
    setRecordingTime(time);
  };

  // Handle toggle recording
  const handleToggleRecording = async () => {
    const recordingHelper = recordingHelperRef.current;
    
    if (!recordingHelper) {
      return;
    }
    
    if (recordingHelper.isCurrentlyRecording()) {
      try {
        // Stop recording
        const recordedBlob = await recordingHelper.stopRecording();
        
        // Download the recording
        recordingHelper.downloadRecording(recordedBlob, `video-chat-${roomId}`);
        
        // Update state
        setIsRecording(false);
        setRecordingTime(0);
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    } else {
      // Start recording
      const streamsToRecord = [localVideoStream];
      
      // Add remote streams
      Object.values(remoteVideoStreams).forEach(stream => {
        if (stream) {
          streamsToRecord.push(stream);
        }
      });
      
      // Add screen sharing stream if active
      if (isScreenSharing && screenStream) {
        streamsToRecord.push(screenStream);
      }
      
      // Start recording
      const success = recordingHelper.startRecording(
        streamsToRecord.filter(Boolean),
        handleRecordingTimeUpdate
      );
      
      if (success) {
        setIsRecording(true);
      }
    }
  };
  
  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header with room info and controls */}
      <div className="bg-gray-900 border-b border-gray-800 shadow-md">
        <div className="flex items-center justify-between p-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Room: {roomId}</h2>
            <p className="text-sm text-gray-400">Connected as {userId}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleLeaveRoom}
              className={clsx(
                'inline-flex items-center justify-center px-4 py-[calc(--spacing(2)-1px)]',
                'rounded-full border border-transparent bg-[#D15052] shadow-md',
                'text-base font-medium whitespace-nowrap text-white',
                'hover:bg-[#C04042] focus:outline-none'
              )}
              aria-label="Leave chat room"
            >
              Leave
            </button>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 p-6 overflow-auto bg-gradient-to-b from-gray-950 to-gray-900">
        {isConnecting ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-lg font-medium mb-2 text-white">Connecting...</div>
            <div className="text-sm text-gray-400">
              Setting up secure connection
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-lg font-medium text-[#D15052] mb-2">Error</div>
            <div className="text-sm text-gray-400 mb-4">{error}</div>
            <button
              onClick={handleLeaveRoom}
              className={clsx(
                'inline-flex items-center justify-center px-4 py-[calc(--spacing(2)-1px)]',
                'rounded-full border border-transparent bg-gray-800 shadow-md',
                'text-base font-medium whitespace-nowrap text-white',
                'hover:bg-gray-700'
              )}
            >
              Go Back
            </button>
          </div>
        ) : (
          <div className="flex flex-col space-y-6">
            {/* QR Code */}
            {showQRCode && (
              <div className="bg-gray-800 p-6 rounded-2xl shadow-lg mx-auto max-w-xs border border-gray-700">
                <QRCodeGenerator
                  connectionData={getConnectionData()}
                  className="mx-auto"
                />
                <p className="text-center mt-4 text-sm text-gray-300">
                  Scan to join this room
                </p>
              </div>
            )}
            
            {/* Camera permission guide */}
            {cameraStatus && cameraStatus.status !== 'granted' && isVideoEnabled && (
              <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
                <CameraPermissionGuide
                  onRetry={handleRetryCameraAccess}
                  errorMessage={cameraStatus.error}
                />
              </div>
            )}
            
            {/* Video grid */}
            <div className={cn(
              'grid gap-6',
              getGridColumns()
            )}>
              {/* Local video */}
              {isVideoEnabled && (
                <VideoContainer
                  stream={isScreenSharing ? screenStream : localVideoStream}
                  isMuted={true}
                  isLocal={true}
                  isSpeaking={isSpeaking}
                  label={`${userId} (You)`}
                  isScreenSharing={isScreenSharing}
                />
              )}
              
              {/* Remote videos */}
              {Object.entries(remoteVideoStreams).map(([peerId, stream]) => (
                <VideoContainer
                  key={peerId}
                  stream={stream}
                  isMuted={false}
                  isLocal={false}
                  isSpeaking={peerSpeaking[peerId]}
                  label={peerId}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Video controls */}
      {!isConnecting && !error && (
        <div className="bg-gray-900 border-t border-gray-800 p-6">
          <div className="flex flex-wrap items-center justify-center gap-4">
            {/* Mute/Unmute */}
            <button
              onClick={handleToggleMute}
              className={clsx(
                'inline-flex items-center justify-center px-4 py-[calc(--spacing(2)-1px)]',
                'rounded-full border border-transparent shadow-md',
                isMuted ? 'bg-[#D15052] text-white' : 'bg-gray-800 text-white',
                'hover:bg-opacity-90 focus:outline-none'
              )}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
            
            {/* Video toggle */}
            <button
              onClick={handleToggleVideo}
              className={clsx(
                'inline-flex items-center justify-center px-4 py-[calc(--spacing(2)-1px)]',
                'rounded-full border border-transparent shadow-md',
                isVideoEnabled ? 'bg-gray-800 text-white' : 'bg-[#4A72F5] text-white',
                'hover:bg-opacity-90 focus:outline-none'
              )}
              aria-label={isVideoEnabled ? 'Disable Video' : 'Enable Video'}
            >
              {isVideoEnabled ? 'Disable Video' : 'Enable Video'}
            </button>
            
            {/* Screen sharing (Phase 3) */}
            <ScreenShareButton
              isScreenSharing={isScreenSharing}
              onToggle={handleToggleScreenShare}
            />
            
            {/* Recording (Phase 3) */}
            <RecordButton
              isRecording={isRecording}
              recordingTime={recordingTime}
              onToggle={handleToggleRecording}
            />
            
            {/* Video quality controls (Phase 2) */}
            <VideoQualityControls
              currentQuality={currentVideoQuality}
              onQualityChange={handleVideoQualityChange}
            />
            
            {/* QR Code toggle */}
            <button
              onClick={handleToggleQRCode}
              className={clsx(
                'inline-flex items-center justify-center px-4 py-[calc(--spacing(2)-1px)]',
                'rounded-full border border-transparent shadow-md',
                showQRCode ? 'bg-[#9C5AE5] text-white' : 'bg-gray-800 text-white',
                'hover:bg-opacity-90 focus:outline-none'
              )}
              aria-label={showQRCode ? 'Hide QR Code' : 'Show QR Code'}
            >
              {showQRCode ? 'Hide QR Code' : 'Show QR Code'}
            </button>
          </div>
          
          {/* Network quality indicator (Phase 2) */}
          <div className="mt-6 flex justify-center">
            <NetworkQualityIndicator quality={networkQuality} />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoChatRoom;
