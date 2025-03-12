/**
 * Screen sharing helper functions for WebRTCManager
 */

/**
 * Start screen sharing
 * @param {WebRTCManager} manager - WebRTC manager instance
 * @returns {Promise<boolean>} Success status
 */
export const startScreenSharing = async (manager) => {
  try {
    if (manager.isScreenSharing) {
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
    manager.localScreenStream = screenStream;
    manager.isScreenSharing = true;
    
    // Add screen track to all peer connections
    for (const [peerId, peerConnection] of manager.peerConnections.entries()) {
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
        await manager._createAndSendOffer(peerId);
      }
    }
    
    // Handle screen sharing stop event
    screenStream.getVideoTracks()[0].addEventListener('ended', () => {
      stopScreenSharing(manager);
    });
    
    // Notify about screen sharing
    if (manager.onScreenSharingChange) {
      manager.onScreenSharingChange(true, screenStream);
    }
    
    return true;
  } catch (error) {
    console.error('Error starting screen sharing:', error);
    return false;
  }
};

/**
 * Stop screen sharing
 * @param {WebRTCManager} manager - WebRTC manager instance
 * @returns {Promise<boolean>} Success status
 */
export const stopScreenSharing = async (manager) => {
  try {
    if (!manager.isScreenSharing || !manager.localScreenStream) {
      return false;
    }
    
    // Stop all screen tracks
    manager.localScreenStream.getTracks().forEach(track => track.stop());
    
    // Reset screen sharing state
    manager.localScreenStream = null;
    manager.isScreenSharing = false;
    
    // Restore video tracks in all peer connections
    if (manager.localVideoStream) {
      const videoTrack = manager.localVideoStream.getVideoTracks()[0];
      
      for (const [peerId, peerConnection] of manager.peerConnections.entries()) {
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
    if (manager.onScreenSharingChange) {
      manager.onScreenSharingChange(false, null);
    }
    
    return true;
  } catch (error) {
    console.error('Error stopping screen sharing:', error);
    return false;
  }
};

/**
 * Toggle screen sharing
 * @param {WebRTCManager} manager - WebRTC manager instance
 * @returns {Promise<boolean>} New screen sharing status
 */
export const toggleScreenSharing = async (manager) => {
  if (manager.isScreenSharing) {
    return await stopScreenSharing(manager);
  } else {
    return await startScreenSharing(manager);
  }
};

export default {
  startScreenSharing,
  stopScreenSharing,
  toggleScreenSharing
};
