#!/bin/bash

# Create a temporary file with the corrected content
cat > ./client/src/utils/webrtcManager.js.fixed << 'EOL'
import { WebRTCQualityMonitor } from './webrtcQualityMonitor';
import { getOptimalVideoConstraints, isMobileDevice } from './responsiveHelper';

/**
 * WebRTC Manager class
 * Handles WebRTC connections and media streams
 */
export class WebRTCManager {
  constructor(socket, options = {}) {
    this.socket = socket;
    this.userId = options.userId || `user-${Math.floor(Math.random() * 10000)}`;
    this.roomId = null;
    this.peerConnections = new Map();
    this.audioQualityMonitors = new Map();
    this.localStream = null;
    this.localVideoStream = null;
    this.localScreenStream = null; // For screen sharing
    this.isScreenSharing = false; // Screen sharing status
    this.speakingDetector = null;
    this.iceServers = options.iceServers || [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ];
    this.onRemoteStreamAdded = options.onRemoteStreamAdded;
    this.onRemoteStreamRemoved = options.onRemoteStreamRemoved;
    this.onPeerConnected = options.onPeerConnected;
    this.onPeerDisconnected = options.onPeerDisconnected;
    this.onAudioLevelChange = options.onAudioLevelChange;
    this.onVideoStatusChange = options.onVideoStatusChange;
    this.onScreenSharingChange = options.onScreenSharingChange;
    this.onNetworkQualityChange = options.onNetworkQualityChange;
    
    // Initialize WebRTC quality monitor
    this.qualityMonitor = new WebRTCQualityMonitor({
      onQualityChange: this._handleQualityChange.bind(this),
      adaptiveMode: options.adaptiveMode || true
    });
    
    // Current video quality preset
    this.currentQuality = 'medium';
    
    // Setup socket event listeners
    this._setupSocketListeners();
  }

  /**
   * Initialize WebRTC and join room
   * @param {string} roomId - Room ID to join
   * @returns {Promise<void>}
   */
  async initialize(roomId) {
    this.roomId = roomId;
    
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      
      this.localStream = stream;
      
      // Join room
      this.socket.emit('join-room', {
        roomId: this.roomId,
        userId: this.userId
      });
      
      // Setup audio level detection
      this._setupAudioLevelDetection(stream);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      return Promise.reject(error);
    }
  }
  
  /**
   * Enable video
   * @param {MediaTrackConstraints} constraints - Video constraints
   * @returns {Promise<MediaStream>}
   */
  async enableVideo(constraints = { width: 640, height: 480 }) {
    try {
      // Get video stream
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: constraints
      });
      
      this.localVideoStream = videoStream;
      
      // Add video tracks to all peer connections
      for (const [peerId, peerConnection] of this.peerConnections.entries()) {
        const videoTrack = videoStream.getVideoTracks()[0];
        
        if (videoTrack) {
          peerConnection.addTrack(videoTrack, videoStream);
          
          // Renegotiate the connection
          await this._createAndSendOffer(peerId);
        }
      }
      
      // Notify about video status change
      if (this.onVideoStatusChange) {
        this.onVideoStatusChange(true, videoStream);
      }
      
      return videoStream;
    } catch (error) {
      console.error('Error enabling video:', error);
      throw error;
    }
  }
  
  /**
   * Disable video
   */
  disableVideo() {
    if (!this.localVideoStream) {
      return;
    }
    
    // Stop all video tracks
    this.localVideoStream.getVideoTracks().forEach(track => {
      track.stop();
    });
    
    // Remove video tracks from all peer connections
    for (const [peerId, peerConnection] of this.peerConnections.entries()) {
      const senders = peerConnection.getSenders();
      const videoSender = senders.find(sender => 
        sender.track && sender.track.kind === 'video'
      );
      
      if (videoSender) {
        peerConnection.removeTrack(videoSender);
        
        // Renegotiate the connection
        this._createAndSendOffer(peerId).catch(console.error);
      }
    }
    
    // Reset local video stream
    this.localVideoStream = null;
    
    // Notify about video status change
    if (this.onVideoStatusChange) {
      this.onVideoStatusChange(false, null);
    }
  }
  
  /**
   * Set video quality
   * @param {string} preset - Quality preset (low, medium, high, hd, auto)
   * @returns {Promise<void>}
   */
  async setVideoQuality(preset) {
    // Use responsive helper to get optimal constraints based on device and quality
    const optimalConstraints = getOptimalVideoConstraints(preset);
    
    // For backward compatibility, keep the switch but use optimal constraints
    let constraints = optimalConstraints;
    
    switch (preset) {
      case 'low':
        constraints = { ...optimalConstraints, width: { ideal: optimalConstraints.width }, height: { ideal: optimalConstraints.height }, frameRate: { ideal: optimalConstraints.frameRate } };
        break;
      case 'medium':
        constraints = { ...optimalConstraints, width: { ideal: optimalConstraints.width }, height: { ideal: optimalConstraints.height }, frameRate: { ideal: optimalConstraints.frameRate } };
        break;
      case 'high':
        constraints = { ...optimalConstraints, width: { ideal: optimalConstraints.width }, height: { ideal: optimalConstraints.height }, frameRate: { ideal: optimalConstraints.frameRate } };
        break;
      case 'hd':
        constraints = { ...optimalConstraints, width: { ideal: optimalConstraints.width }, height: { ideal: optimalConstraints.height }, frameRate: { ideal: optimalConstraints.frameRate } };
        break;
      case 'auto':
      default:
        // Use adaptive quality based on network conditions
        this.qualityMonitor.setAdaptiveMode(true);
        constraints = { width: 1280, height: 720, frameRate: 30 };
        break;
    }
    
    // Store current quality
    this.currentQuality = preset;
    
    // Disable adaptive mode if not auto
    if (preset !== 'auto') {
      this.qualityMonitor.setAdaptiveMode(false);
    }
    
    // If video is already enabled, update constraints
    if (this.localVideoStream) {
      // Get current video track
      const videoTrack = this.localVideoStream.getVideoTracks()[0];
      
      if (videoTrack) {
        // Apply new constraints
        try {
          await videoTrack.applyConstraints(constraints);
          
          // Notify about quality change
          if (this.onNetworkQualityChange) {
            this.onNetworkQualityChange(100, { preset });
          }
        } catch (error) {
          console.error('Error applying video constraints:', error);
          
          // Fallback: restart video with new constraints
          this.disableVideo();
          await this.enableVideo(constraints);
        }
      }
    }
  }
  
  /**
   * Get available video devices
   * @returns {Promise<MediaDeviceInfo[]>}
   */
  async getVideoDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('Error getting video devices:', error);
      return [];
    }
  }
  
  /**
   * Change video device
   * @param {string} deviceId - Device ID
   * @returns {Promise<MediaStream>}
   */
  async changeVideoDevice(deviceId) {
    try {
      // Get current constraints
      let constraints = { deviceId: { exact: deviceId } };
      
      // Add quality constraints if available
      if (this.currentQuality) {
        const qualityConstraints = getOptimalVideoConstraints(this.currentQuality);
        constraints = {
          ...constraints,
          width: { ideal: qualityConstraints.width },
          height: { ideal: qualityConstraints.height },
          frameRate: { ideal: qualityConstraints.frameRate }
        };
      }
      
      // Disable current video
      this.disableVideo();
      
      // Enable video with new device
      return await this.enableVideo(constraints);
    } catch (error) {
      console.error('Error changing video device:', error);
      throw error;
    }
  }
  
  /**
   * Leave room
   */
  leaveRoom() {
    // Emit leave room event
    this.socket.emit('leave-room', {
      roomId: this.roomId,
      userId: this.userId
    });
    
    // Reset room ID
    this.roomId = null;
    
    // Disconnect from all peers
    this.disconnect();
  }
  
  /**
   * Disconnect from all peers
   */
  disconnect() {
    // Stop all local streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.localVideoStream) {
      this.localVideoStream.getTracks().forEach(track => track.stop());
      this.localVideoStream = null;
    }
    
    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach(track => track.stop());
      this.localScreenStream = null;
      this.isScreenSharing = false;
    }
    
    // Close all peer connections
    for (const [peerId, peerConnection] of this.peerConnections.entries()) {
      if (peerConnection) {
        peerConnection.close();
      }
    }
    
    this.peerConnections.clear();
    this.audioQualityMonitors.clear();
    
    // Remove socket listeners
    this.socket.off('user-connected');
    this.socket.off('user-disconnected');
    this.socket.off('receive-signal');
  }
  
  /**
   * Handle quality change from WebRTCQualityMonitor
   * @param {number} quality - Quality score (0-100)
   * @param {Object} metrics - Quality metrics
   * @private
   */
  _handleQualityChange(quality, metrics) {
    // Notify about quality change
    if (this.onNetworkQualityChange) {
      this.onNetworkQualityChange(quality, metrics);
    }
    
    // If in adaptive mode, adjust video quality
    if (this.qualityMonitor.isAdaptiveMode() && this.localVideoStream) {
      const videoTrack = this.localVideoStream.getVideoTracks()[0];
      
      if (videoTrack) {
        // Get target constraints based on quality
        const constraints = this.qualityMonitor.getTargetConstraints(quality);
        
        if (constraints) {
          // Apply constraints
          videoTrack.applyConstraints(constraints).catch(console.error);
        }
      }
    }
  }
  
  /**
   * Setup socket event listeners
   * @private
   */
  _setupSocketListeners() {
    // Handle user connected event
    this.socket.on('user-connected', async ({ userId }) => {
      console.log('User connected:', userId);
      
      // Create peer connection
      await this._createPeerConnection(userId);
      
      // Notify about peer connected
      if (this.onPeerConnected) {
        this.onPeerConnected(userId);
      }
    });
    
    // Handle user disconnected event
    this.socket.on('user-disconnected', ({ userId }) => {
      console.log('User disconnected:', userId);
      
      // Close peer connection
      this._closePeerConnection(userId);
      
      // Notify about peer disconnected
      if (this.onPeerDisconnected) {
        this.onPeerDisconnected(userId);
      }
    });
    
    // Handle receive signal event
    this.socket.on('receive-signal', async ({ userId, signal }) => {
      try {
        // Create peer connection if not exists
        if (!this.peerConnections.has(userId)) {
          await this._createPeerConnection(userId);
        }
        
        const peerConnection = this.peerConnections.get(userId);
        
        // Handle signal
        if (signal.type === 'offer') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          
          // Send answer
          this.socket.emit('send-signal', {
            roomId: this.roomId,
            userId: this.userId,
            targetUserId: userId,
            signal: answer
          });
        } else if (signal.type === 'answer') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.candidate) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(signal));
        }
      } catch (error) {
        console.error('Error handling signal:', error);
      }
    });
  }
  
  /**
   * Create peer connection
   * @param {string} peerId - Peer ID
   * @returns {Promise<RTCPeerConnection>}
   * @private
   */
  async _createPeerConnection(peerId) {
    try {
      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers
      });
      
      // Store peer connection
      this.peerConnections.set(peerId, peerConnection);
      
      // Add local stream tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.localStream);
        });
      }
      
      // Add local video stream tracks
      if (this.localVideoStream) {
        this.localVideoStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.localVideoStream);
        });
      }
      
      // Add local screen stream tracks (if screen sharing is active)
      if (this.isScreenSharing && this.localScreenStream) {
        const screenTrack = this.localScreenStream.getVideoTracks()[0];
        
        if (screenTrack) {
          // Find existing video sender
          const senders = peerConnection.getSenders();
          const videoSender = senders.find(sender => 
            sender.track && sender.track.kind === 'video'
          );
          
          if (videoSender) {
            // Replace existing video track with screen track
            await videoSender.replaceTrack(screenTrack);
          } else {
            // Add screen track if no video sender exists
            peerConnection.addTrack(screenTrack, this.localScreenStream);
          }
        }
      }
      
      // Handle ICE candidate event
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          // Send ICE candidate
          this.socket.emit('send-signal', {
            roomId: this.roomId,
            userId: this.userId,
            targetUserId: peerId,
            signal: event.candidate
          });
        }
      };
      
      // Handle track event
      peerConnection.ontrack = (event) => {
        // Create remote stream if not exists
        const remoteStream = new MediaStream();
        
        // Add track to remote stream
        remoteStream.addTrack(event.track);
        
        // Notify about remote stream added
        if (this.onRemoteStreamAdded) {
          this.onRemoteStreamAdded(peerId, remoteStream);
        }
        
        // Setup audio level detection for remote stream
        if (event.track.kind === 'audio') {
          this._setupRemoteAudioLevelDetection(peerId, remoteStream);
        }
        
        // Setup quality monitoring
        this.qualityMonitor.monitorConnection(peerConnection);
      };
      
      // Handle connection state change event
      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'disconnected' || 
            peerConnection.connectionState === 'failed' ||
            peerConnection.connectionState === 'closed') {
          // Notify about remote stream removed
          if (this.onRemoteStreamRemoved) {
            this.onRemoteStreamRemoved(peerId);
          }
          
          // Remove audio level detection
          if (this.audioQualityMonitors.has(peerId)) {
            this.audioQualityMonitors.delete(peerId);
          }
        }
      };
      
      // Create and send offer
      await this._createAndSendOffer(peerId);
      
      return peerConnection;
    } catch (error) {
      console.error('Error creating peer connection:', error);
      throw error;
    }
  }
  
  /**
   * Create and send offer
   * @param {string} peerId - Peer ID
   * @returns {Promise<void>}
   * @private
   */
  async _createAndSendOffer(peerId) {
    try {
      const peerConnection = this.peerConnections.get(peerId);
      
      if (!peerConnection) {
        throw new Error(`Peer connection not found for ${peerId}`);
      }
      
      // Create offer
      const offer = await peerConnection.createOffer();
      
      // Set local description
      await peerConnection.setLocalDescription(offer);
      
      // Send offer
      this.socket.emit('send-signal', {
        roomId: this.roomId,
        userId: this.userId,
        targetUserId: peerId,
        signal: offer
      });
    } catch (error) {
      console.error('Error creating and sending offer:', error);
      throw error;
    }
  }
  
  /**
   * Close peer connection
   * @param {string} peerId - Peer ID
   * @private
   */
  _closePeerConnection(peerId) {
    // Get peer connection
    const peerConnection = this.peerConnections.get(peerId);
    
    if (peerConnection) {
      // Close peer connection
      peerConnection.close();
      
      // Remove peer connection
      this.peerConnections.delete(peerId);
      
      // Remove audio level detection
      if (this.audioQualityMonitors.has(peerId)) {
        this.audioQualityMonitors.delete(peerId);
      }
      
      // Notify about remote stream removed
      if (this.onRemoteStreamRemoved) {
        this.onRemoteStreamRemoved(peerId);
      }
    }
  }
  
  /**
   * Setup audio level detection
   * @param {MediaStream} stream - Media stream
   * @private
   */
  _setupAudioLevelDetection(stream) {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create analyser
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.1;
      
      // Create source
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      // Create data array
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      // Create speaking detector
      this.speakingDetector = {
        analyser,
        dataArray,
        threshold: 30,
        speakingHistory: Array(5).fill(false),
        isSpeaking: false
      };
      
      // Start detection loop
      this._detectAudioLevel();
    } catch (error) {
      console.error('Error setting up audio level detection:', error);
    }
  }
  
  /**
   * Setup remote audio level detection
   * @param {string} peerId - Peer ID
   * @param {MediaStream} stream - Media stream
   * @private
   */
  _setupRemoteAudioLevelDetection(peerId, stream) {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create analyser
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.1;
      
      // Create source
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      // Create data array
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      // Create speaking detector
      const speakingDetector = {
        analyser,
        dataArray,
        threshold: 30,
        speakingHistory: Array(5).fill(false),
        isSpeaking: false
      };
      
      // Store speaking detector
      this.audioQualityMonitors.set(peerId, speakingDetector);
      
      // Start detection loop
      this._detectRemoteAudioLevel(peerId);
    } catch (error) {
      console.error('Error setting up remote audio level detection:', error);
    }
  }
  
  /**
   * Detect audio level
   * @private
   */
  _detectAudioLevel() {
    if (!this.speakingDetector) {
      return;
    }
    
    // Get speaking detector
    const { analyser, dataArray, threshold, speakingHistory } = this.speakingDetector;
    
    // Get audio level
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate average level
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    
    // Check if speaking
    const isSpeakingNow = average > threshold;
    
    // Update speaking history
    speakingHistory.shift();
    speakingHistory.push(isSpeakingNow);
    
    // Check if speaking status changed
    const isSpeakingMajority = speakingHistory.filter(Boolean).length > speakingHistory.length / 2;
    
    if (isSpeakingMajority !== this.speakingDetector.isSpeaking) {
      // Update speaking status
      this.speakingDetector.isSpeaking = isSpeakingMajority;
      
      // Notify about audio level change
      if (this.onAudioLevelChange) {
        this.onAudioLevelChange(this.userId, isSpeakingMajority, average);
      }
    }
    
    // Continue detection loop
    requestAnimationFrame(() => this._detectAudioLevel());
  }
  
  /**
   * Detect remote audio level
   * @param {string} peerId - Peer ID
   * @private
   */
  _detectRemoteAudioLevel(peerId) {
    // Get speaking detector
    const speakingDetector = this.audioQualityMonitors.get(peerId);
    
    if (!speakingDetector) {
      return;
    }
    
    // Get audio level
    const { analyser, dataArray, threshold, speakingHistory } = speakingDetector;
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate average level
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    
    // Check if speaking
    const isSpeakingNow = average > threshold;
    
    // Update speaking history
    speakingHistory.shift();
    speakingHistory.push(isSpeakingNow);
    
    // Check if speaking status changed
    const isSpeakingMajority = speakingHistory.filter(Boolean).length > speakingHistory.length / 2;
    
    if (isSpeakingMajority !== speakingDetector.isSpeaking) {
      // Update speaking status
      speakingDetector.isSpeaking = isSpeakingMajority;
      
      // Notify about audio level change
      if (this.onAudioLevelChange) {
        this.onAudioLevelChange(peerId, isSpeakingMajority, average);
      }
    }
    
    // Continue detection loop
    requestAnimationFrame(() => this._detectRemoteAudioLevel(peerId));
  }

  /**
   * Start screen sharing
   * @returns {Promise<boolean>} Success status
   */
  async startScreenSharing() {
    try {
      if (this.isScreenSharing) {
        return true;
      }
      
      // Get screen sharing stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
          logicalSurface: true,
          frameRate: 30
        },
        audio: false
      });
      
      // Store screen stream
      this.localScreenStream = screenStream;
      this.isScreenSharing = true;
      
      // Add screen track to all peer connections
      for (const [peerId, peerConnection] of this.peerConnections.entries()) {
        const screenTrack = screenStream.getVideoTracks()[0];
        
        // Find existing video sender
        const senders = peerConnection.getSenders();
        const videoSender = senders.find(sender => 
          sender.track && sender.track.kind === 'video'
        );
        
        if (videoSender) {
          // Replace existing video track with screen track
          await videoSender.replaceTrack(screenTrack);
        } else {
          // Add screen track if no video sender exists
          peerConnection.addTrack(screenTrack, screenStream);
          
          // Renegotiate the connection
          await this._createAndSendOffer(peerId);
        }
      }
      
      // Handle screen sharing stop event
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        this.stopScreenSharing();
      });
      
      // Notify about screen sharing
      if (this.onScreenSharingChange) {
        this.onScreenSharingChange(true, screenStream);
      }
      
      return true;
    } catch (error) {
      console.error('Error starting screen sharing:', error);
      return false;
    }
  }
  
  /**
   * Stop screen sharing
   * @returns {Promise<boolean>} Success status
   */
  async stopScreenSharing() {
    try {
      if (!this.isScreenSharing || !this.localScreenStream) {
        return false;
      }
      
      // Stop all screen tracks
      this.localScreenStream.getTracks().forEach(track => track.stop());
      
      // Reset screen sharing state
      this.localScreenStream = null;
      this.isScreenSharing = false;
      
      // Restore video tracks in all peer connections
      if (this.localVideoStream) {
        const videoTrack = this.localVideoStream.getVideoTracks()[0];
        
        for (const [peerId, peerConnection] of this.peerConnections.entries()) {
          const senders = peerConnection.getSenders();
          const videoSender = senders.find(sender => 
            sender.track && sender.track.kind === 'video'
          );
          
          if (videoSender && videoTrack) {
            await videoSender.replaceTrack(videoTrack);
          }
        }
      }
      
      // Notify about screen sharing stop
      if (this.onScreenSharingChange) {
        this.onScreenSharingChange(false, null);
      }
      
      return true;
    } catch (error) {
      console.error('Error stopping screen sharing:', error);
      return false;
    }
  }
  
  /**
   * Toggle screen sharing
   * @returns {Promise<boolean>} New screen sharing status
   */
  async toggleScreenSharing() {
    if (this.isScreenSharing) {
      return await this.stopScreenSharing();
    } else {
      return await this.startScreenSharing();
    }
  }
  
  /**
   * Check if screen sharing is enabled
   * @returns {boolean} Screen sharing status
   */
  isScreenSharingEnabled() {
    return this.isScreenSharing;
  }
}
EOL

# Replace the original file with the fixed one
mv ./client/src/utils/webrtcManager.js.fixed ./client/src/utils/webrtcManager.js

echo "Fixed WebRTCManager.js file!"
