#!/bin/bash

# Add screen sharing methods to WebRTCManager.js
cat >> ./client/src/utils/webrtcManager.js << 'EOL'

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
EOL

# Add screen sharing properties to constructor
sed -i '' 's/this.localVideoStream = null;/this.localVideoStream = null;\n    this.localScreenStream = null; \/\/ For screen sharing\n    this.isScreenSharing = false; \/\/ Screen sharing status/' ./client/src/utils/webrtcManager.js

# Add onScreenSharingChange to options
sed -i '' 's/this.onVideoStatusChange = options.onVideoStatusChange;/this.onVideoStatusChange = options.onVideoStatusChange;\n    this.onScreenSharingChange = options.onScreenSharingChange;/' ./client/src/utils/webrtcManager.js

echo "Updated WebRTCManager with screen sharing functionality!"
