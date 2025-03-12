// eslint-disable-next-line no-unused-vars
import { createEnhancedAudioStream } from './audioProcessor';
import { SpeakingDetector } from './speakingDetector';
import { AudioQualityMonitor } from './qualityMonitor';
import { createMicrophoneStatus } from './browserDetection';

/**
 * WebRTC Manager for handling peer connections
 */
export class WebRTCManager {
  /**
   * Create a new WebRTC manager
   * @param {Socket} socket - Socket.IO socket
   * @param {Object} options - Configuration options
   */
  constructor(socket, options = {}) {
    // Store socket
    this.socket = socket;
    this.userId = options.userId;
    
    // Configuration
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
      iceCandidatePoolSize: 10,
    };
    
    // Enhanced audio settings
    this.audioConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 1
    };
    
    // State
    this.roomId = null;
    this.localStream = null;
    this.peerConnections = new Map();
    this.speakingDetector = null;
    this.audioQualityMonitors = new Map();
    this.microphoneInitialized = false;
    this.microphonePermissionRequested = false;
    this.permissionDenied = false; // Track if permission has been denied
    
    // Callbacks
    this.onPeerConnect = options.onPeerConnect || null;
    this.onPeerDisconnect = options.onPeerDisconnect || null;
    this.onSpeakingChange = options.onSpeakingChange || null;
    this.onAudioQualityChange = options.onAudioQualityChange || null;
    this.onError = options.onError || null;
    this.onMicrophoneStatus = options.onMicrophoneStatus || null;
    
    // Bind methods
    this._handleUserMediaError = this._handleUserMediaError.bind(this);
    this._notifyError = this._notifyError.bind(this);
  }
  
  /**
   * Notify about errors in a consistent way
   * @param {string|Error} error - Error message or object
   * @param {string} defaultMessage - Default message if error is empty
   * @private
   */
  _notifyError(error, defaultMessage = 'An unknown error occurred') {
    let errorMessage = defaultMessage;
    
    if (error) {
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error instanceof Error) {
        errorMessage = error.message || error.toString();
      } else if (error.name || error.message) {
        errorMessage = error.message || error.name;
      }
    }
    
    console.error(defaultMessage, error || {});
    
    if (this.onError) {
      this.onError(errorMessage);
    }
    
    return errorMessage;
  }
  
  /**
   * Handle user media errors
   * @param {Error} error - The error that occurred
   * @private
   */
  _handleUserMediaError(error) {
    let errorMessage = 'Failed to access microphone. Please check your permissions.';
    
    // Check if error exists and has properties
    if (error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
        
        // Show instructions for enabling microphone
        if (this.onMicrophoneStatus) {
          this.onMicrophoneStatus(createMicrophoneStatus('denied', error.message));
        }
        this.permissionDenied = true; // Mark permission as denied to prevent repeated attempts
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Could not start microphone. It may be in use by another application.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Microphone constraints cannot be satisfied. Please try with different settings.';
      } else if (error.name === 'TypeError') {
        errorMessage = 'Invalid audio constraints. Please check your browser compatibility.';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Microphone access request was aborted. Please try again.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Microphone access blocked due to security policy. Try using HTTPS.';
      }
    }
    
    this._notifyError(error, errorMessage);
    return errorMessage;
  }
  
  /**
   * Initialize WebRTC with local audio stream
   * @param {string} roomId - ID of the room to join
   * @returns {Promise<boolean>} Success status
   */
  async initialize(roomId) {
    try {
      // If permission was previously denied, don't try again automatically
      if (this.permissionDenied) {
        this.onMicrophoneStatus(createMicrophoneStatus('denied'));
        return false;
      }
      
      // Store room ID
      this.roomId = roomId;
      this.microphonePermissionRequested = true;
      
      if (this.onMicrophoneStatus) {
        this.onMicrophoneStatus(createMicrophoneStatus('requesting'));
      }
      
      // Try with simpler constraints first
      const constraints = {
        audio: true,
        video: false
      };
      
      try {
        // Get user media with basic audio settings first
        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        this.microphoneInitialized = true;
        
        if (this.onMicrophoneStatus) {
          this.onMicrophoneStatus(createMicrophoneStatus('granted'));
        }
        
        // If basic constraints work, try to apply enhanced settings
        try {
          const enhancedStream = await navigator.mediaDevices.getUserMedia({
            audio: this.audioConstraints,
            video: false
          });
          
          // Replace the basic stream with enhanced stream
          this.localStream.getTracks().forEach(track => track.stop());
          this.localStream = enhancedStream;
        } catch (enhancedError) {
          console.warn('Could not apply enhanced audio settings, using basic audio:', enhancedError);
          // Continue with basic audio, no need to throw
        }
      } catch (basicError) {
        // If basic constraints fail, throw the error to be caught by outer try/catch
        throw basicError;
      }
      
      // Create speaking detector
      if (this.localStream) {
        this.speakingDetector = new SpeakingDetector(this.localStream, {
          onSpeakingChange: (speaking) => {
            if (this.onSpeakingChange) {
              this.onSpeakingChange(speaking);
            }
            
            // Emit speaking status to other users
            if (this.socket && this.socket.connected) {
              this.socket.emit('speaking', {
                roomId: this.roomId,
                speaking
              });
            }
          }
        });
        this.speakingDetector.start();
      } else {
        throw new Error('Failed to initialize local stream');
      }
      
      console.log('WebRTC initialized successfully with roomId:', roomId);
      return true;
    } catch (error) {
      this.microphoneInitialized = false;
      const errorMessage = this._handleUserMediaError(error);
      throw new Error(errorMessage);
    }
  }
  
  /**
   * Retry microphone access
   * @returns {Promise<boolean>} Success status
   */
  async retryMicrophoneAccess() {
    try {
      // Reset permission denied flag to allow retry
      this.permissionDenied = false;
      
      // Notify about microphone status
      this.onMicrophoneStatus(createMicrophoneStatus('requesting'));
      
      // Get user media with audio
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: this.audioConstraints,
        video: false
      });
      
      // Microphone access granted
      this.onMicrophoneStatus(createMicrophoneStatus('granted'));
      
      // Initialize speaking detector
      if (this.speakingDetector) {
        this.speakingDetector.stop();
      }
      
      this.speakingDetector = new SpeakingDetector(this.localStream, {
        onSpeakingChange: (speaking) => {
          this.onSpeakingChange(speaking);
          
          // Emit speaking status to other users
          if (this.socket && this.socket.connected) {
            this.socket.emit('speaking', {
              roomId: this.roomId,
              speaking
            });
          }
        }
      });
      
      this.speakingDetector.start();
      
      // Rejoin room if needed
      if (this.roomId && this.socket && this.socket.connected) {
        this.socket.emit('join', { roomId: this.roomId });
      }
      
      return true;
    } catch (error) {
      // Handle specific getUserMedia errors
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.permissionDenied = true; // Mark permission as denied
        this.onMicrophoneStatus(createMicrophoneStatus('denied', error.message));
        this.onError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        this.onMicrophoneStatus(createMicrophoneStatus('unavailable', error.message));
        this.onError('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        this.onMicrophoneStatus(createMicrophoneStatus('unavailable', error.message));
        this.onError('Could not access microphone. It may be in use by another application.');
      } else {
        this.onMicrophoneStatus(createMicrophoneStatus('error', error.message));
        this.onError(`Microphone error: ${error.message || 'Unknown error'}`);
      }
      
      console.error('Error accessing microphone:', error);
      return false;
    }
  }
  
  /**
   * Create a new peer connection for a user
   * @param {string} peerId - ID of the peer to connect to
   * @param {boolean} isInitiator - Whether this peer is initiating the connection
   * @returns {RTCPeerConnection} The created peer connection
   */
  _createPeerConnection(peerId, isInitiator = false) {
    try {
      console.log(`Creating peer connection for ${peerId}, isInitiator: ${isInitiator}`);
      
      // Create new peer connection
      const peerConnection = new RTCPeerConnection(this.config);
      
      // Add local stream tracks to peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          console.log(`Adding track to peer connection: ${track.kind}`);
          peerConnection.addTrack(track, this.localStream);
        });
      } else {
        console.error('No local stream available when creating peer connection');
        if (this.onError) {
          this.onError('Microphone not initialized. Please refresh and try again.');
        }
      }
      
      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate to peer:', peerId);
          this.socket.emit('iceCandidate', {
            to: peerId,
            from: this.userId,
            candidate: event.candidate,
          });
        }
      };
      
      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(`Connection state changed to: ${peerConnection.connectionState} for peer ${peerId}`);
        switch (peerConnection.connectionState) {
          case 'connected':
            console.log(`Connected to peer: ${peerId}`);
            break;
          case 'disconnected':
          case 'failed':
          case 'closed':
            console.log(`Disconnected from peer: ${peerId}`);
            if (this.onPeerDisconnect) {
              this.onPeerDisconnect(peerId);
            }
            this._cleanupPeerConnection(peerId);
            break;
          default:
            break;
        }
      };
      
      // Handle incoming tracks
      peerConnection.ontrack = (event) => {
        console.log(`Received track from peer ${peerId}: ${event.track.kind}`);
        const stream = event.streams[0];
        
        // Store remote stream and create audio element
        if (stream) {
          console.log(`Received stream from peer ${peerId}`);
          
          // Create audio quality monitor
          const qualityMonitor = new AudioQualityMonitor(peerConnection, {
            onQualityChange: (quality, metrics) => {
              if (this.onAudioQualityChange) {
                this.onAudioQualityChange(peerId, quality, metrics);
              }
            }
          });
          qualityMonitor.start();
          this.audioQualityMonitors.set(peerId, qualityMonitor);
          
          // Notify about the new stream
          if (this.onPeerConnect) {
            this.onPeerConnect(peerId, stream);
          }
        }
      };
      
      // Store peer connection
      this.peerConnections.set(peerId, peerConnection);
      
      // If initiator, create and send offer
      if (isInitiator) {
        console.log(`Initiating offer creation for peer ${peerId}`);
        this._createAndSendOffer(peerId);
      }
      
      return peerConnection;
    } catch (error) {
      console.error('Error creating peer connection:', error);
      if (this.onError) {
        this.onError('Failed to create connection. Please try again.');
      }
      return null;
    }
  }
  
  /**
   * Create and send an offer to a peer
   * @param {string} peerId - ID of the peer to send offer to
   * @returns {Promise<void>}
   */
  async _createAndSendOffer(peerId) {
    try {
      console.log(`Creating offer for peer ${peerId}`);
      const peerConnection = this.peerConnections.get(peerId);
      if (!peerConnection) {
        console.error(`No peer connection found for ${peerId}`);
        return;
      }
      
      // Create offer with audio preferences
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      
      // Set local description
      await peerConnection.setLocalDescription(offer);
      console.log(`Local description set for peer ${peerId}`);
      
      // Send offer to peer
      this.socket.emit('offer', {
        to: peerId,
        from: this.userId,
        offer: peerConnection.localDescription,
      });
      console.log(`Offer sent to peer ${peerId}`);
    } catch (error) {
      console.error('Error creating offer:', error);
      if (this.onError) {
        this.onError('Failed to create connection offer. Please try again.');
      }
    }
  }
  
  /**
   * Handle incoming offer from a peer
   * @param {string} peerId - ID of the peer who sent the offer
   * @param {RTCSessionDescription} offer - The offer from the peer
   * @returns {Promise<void>}
   */
  async _handleOffer(peerId, offer) {
    try {
      console.log(`Handling offer from peer ${peerId}`);
      
      // Get or create peer connection
      let peerConnection = this.peerConnections.get(peerId);
      if (!peerConnection) {
        console.log(`Creating new peer connection for ${peerId} to handle offer`);
        peerConnection = this._createPeerConnection(peerId);
      }
      
      if (!peerConnection) {
        console.error(`Failed to create peer connection for ${peerId}`);
        return;
      }
      
      // Set remote description
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      console.log(`Remote description set for peer ${peerId}`);
      
      // Create answer
      const answer = await peerConnection.createAnswer();
      console.log(`Answer created for peer ${peerId}`);
      
      // Set local description
      await peerConnection.setLocalDescription(answer);
      console.log(`Local description set for peer ${peerId}`);
      
      // Send answer to peer
      this.socket.emit('answer', {
        to: peerId,
        from: this.userId,
        answer: peerConnection.localDescription,
      });
      console.log(`Answer sent to peer ${peerId}`);
    } catch (error) {
      console.error('Error handling offer:', error);
      if (this.onError) {
        this.onError('Failed to process incoming connection. Please try again.');
      }
    }
  }
  
  /**
   * Handle incoming answer from a peer
   * @param {string} peerId - ID of the peer who sent the answer
   * @param {RTCSessionDescription} answer - The answer from the peer
   * @returns {Promise<void>}
   */
  async _handleAnswer(peerId, answer) {
    try {
      console.log(`Handling answer from peer ${peerId}`);
      const peerConnection = this.peerConnections.get(peerId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        console.log(`Remote description set for peer ${peerId} from answer`);
      } else {
        console.error(`No peer connection found for ${peerId} when handling answer`);
      }
    } catch (error) {
      console.error('Error handling answer:', error);
      if (this.onError) {
        this.onError('Failed to establish connection. Please try again.');
      }
    }
  }
  
  /**
   * Handle incoming ICE candidate from a peer
   * @param {string} peerId - ID of the peer who sent the ICE candidate
   * @param {RTCIceCandidate} candidate - The ICE candidate
   * @returns {Promise<void>}
   */
  async _handleIceCandidate(peerId, candidate) {
    try {
      console.log(`Handling ICE candidate from peer ${peerId}`);
      const peerConnection = this.peerConnections.get(peerId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log(`Successfully added ICE candidate for peer ${peerId}`);
      } else {
        console.warn(`Received ICE candidate for non-existent peer connection: ${peerId}`);
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
      if (this.onError) {
        this.onError('Failed to establish connection. Please try again.');
      }
    }
  }
  
  /**
   * Clean up a peer connection
   * @param {string} peerId - ID of the peer
   */
  _cleanupPeerConnection(peerId) {
    try {
      console.log(`Cleaning up peer connection for ${peerId}`);
      const peerConnection = this.peerConnections.get(peerId);
      if (peerConnection) {
        peerConnection.onicecandidate = null;
        peerConnection.ontrack = null;
        peerConnection.onconnectionstatechange = null;
        peerConnection.close();
        this.peerConnections.delete(peerId);
      }
      
      // Clean up audio quality monitor
      const qualityMonitor = this.audioQualityMonitors.get(peerId);
      if (qualityMonitor) {
        qualityMonitor.stop();
        this.audioQualityMonitors.delete(peerId);
      }
      
      console.log(`Peer connection for ${peerId} cleaned up`);
    } catch (error) {
      console.error(`Error cleaning up peer connection for ${peerId}:`, error);
    }
  }
  
  /**
   * Accept an incoming call
   * @param {string} peerId - ID of the peer who initiated the call
   * @param {RTCSessionDescription} offer - The offer from the peer
   * @returns {Promise<boolean>} Success status
   */
  async acceptIncomingCall(peerId, offer) {
    try {
      console.log(`Accepting incoming call from ${peerId}`);
      await this._handleOffer(peerId, offer);
      return true;
    } catch (error) {
      console.error('Error accepting call:', error);
      if (this.onError) {
        this.onError('Failed to accept call. Please try again.');
      }
      throw error;
    }
  }

  /**
   * Start a call with a specific peer
   * @param {string} peerId - ID of the peer to call
   * @returns {Promise<RTCPeerConnection>} The peer connection
   */
  async startCall(peerId) {
    try {
      if (!this.microphonePermissionRequested) {
        await this.initialize(this.roomId || 'default');
      }
      
      if (!this.localStream || !this.microphoneInitialized) {
        throw new Error('Microphone not initialized. Please refresh and try again.');
      }
      
      // Create peer connection
      const peerConnection = this._createPeerConnection(peerId, true);
      
      // Add local tracks to the connection
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream);
      });
      
      // Create and send offer
      await this._createAndSendOffer(peerId);
      
      return peerConnection;
    } catch (error) {
      this._notifyError(error, 'Failed to start call');
      throw error;
    }
  }

  /**
   * Handle an answer from a peer
   * @param {string} peerId - ID of the peer who sent the answer
   * @param {RTCSessionDescription} answer - The answer from the peer
   * @returns {Promise<void>}
   */
  async handleAnswer(peerId, answer) {
    console.log(`Handling answer from ${peerId} in public method`);
    return this._handleAnswer(peerId, answer);
  }

  /**
   * Add an ICE candidate from a peer
   * @param {string} peerId - ID of the peer who sent the ICE candidate
   * @param {RTCIceCandidate} candidate - The ICE candidate
   * @returns {Promise<void>}
   */
  async addIceCandidate(peerId, candidate) {
    console.log(`Adding ICE candidate from ${peerId} in public method`);
    return this._handleIceCandidate(peerId, candidate);
  }
  
  /**
   * Bind socket event handlers
   */
  _bindSocketEvents() {
    // We don't need to bind socket events here since we're handling them in App.js
    // This method is kept for future enhancements
  }
  
  /**
   * Check if microphone is muted
   * @returns {boolean} Mute status
   */
  isMuted() {
    if (!this.localStream) return true;
    
    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) return true;
    
    return !audioTracks[0].enabled;
  }
  
  /**
   * Toggle microphone mute state
   * @returns {boolean} New mute status
   */
  toggleMute() {
    if (!this.localStream) return true;
    
    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) return true;
    
    const track = audioTracks[0];
    track.enabled = !track.enabled;
    
    return !track.enabled;
  }
  
  /**
   * Get current audio level (0-100)
   * @returns {number} Audio level
   */
  getAudioLevel() {
    if (this.speakingDetector) {
      return this.speakingDetector.getAudioLevel();
    }
    return 0;
  }
  
  /**
   * Get connection quality for a peer
   * @param {string} peerId - ID of the peer
   * @returns {Promise<Object>} Quality metrics
   */
  async getConnectionQuality(peerId) {
    const qualityMonitor = this.audioQualityMonitors.get(peerId);
    if (qualityMonitor) {
      return await qualityMonitor.getQualityMetrics();
    }
    return { quality: 'unknown', metrics: {} };
  }
  
  /**
   * Leave the room and clean up all connections
   */
  leaveRoom() {
    // Stop all peer connections
    for (const peerId of this.peerConnections.keys()) {
      this._cleanupPeerConnection(peerId);
    }
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Stop speaking detector
    if (this.speakingDetector) {
      try {
        this.speakingDetector.stop();
      } catch (error) {
        console.error('Error stopping speaking detector:', error);
      }
    }
    
    // Reset state
    this.roomId = null;
    this.peerConnections.clear();
    this.audioQualityMonitors.clear();
    this.speakingDetector = null;
    this.microphoneInitialized = false;
    this.microphonePermissionRequested = false;
    this.permissionDenied = false;
  }
  
  /**
   * Dispose of all resources
   */
  dispose() {
    console.log('Disposing WebRTC manager');
    this.leaveRoom();
    
    // Unbind socket events
    if (this.socket) {
      this.socket.off('userJoined');
      this.socket.off('userLeft');
      this.socket.off('offer');
      this.socket.off('answer');
      this.socket.off('iceCandidate');
      this.socket.off('speaking');
    }
    
    console.log('WebRTC manager disposed');
  }
}
