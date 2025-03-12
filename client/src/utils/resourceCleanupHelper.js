/**
 * Resource Cleanup Helper
 * 
 * Provides utilities for properly cleaning up WebRTC resources
 */

/**
 * Clean up WebRTC resources
 * @param {WebRTCManager} manager - WebRTC manager instance
 */
export const cleanupWebRTCResources = (manager) => {
  if (!manager) return;
  
  // Stop all local streams
  stopAllStreams(manager.localStream);
  stopAllStreams(manager.localVideoStream);
  stopAllStreams(manager.localScreenStream);
  
  // Close all peer connections
  if (manager.peerConnections) {
    for (const [_, peerConnection] of manager.peerConnections.entries()) {
      closeConnection(peerConnection);
    }
    manager.peerConnections.clear();
  }
  
  // Clear audio quality monitors
  if (manager.audioQualityMonitors) {
    manager.audioQualityMonitors.clear();
  }
  
  // Reset WebRTC manager state
  manager.localStream = null;
  manager.localVideoStream = null;
  manager.localScreenStream = null;
  manager.isScreenSharing = false;
};

/**
 * Stop all tracks in a media stream
 * @param {MediaStream} stream - Media stream to stop
 */
export const stopAllStreams = (stream) => {
  if (!stream) return;
  
  // Stop all tracks in the stream
  stream.getTracks().forEach(track => {
    track.stop();
  });
};

/**
 * Close a peer connection
 * @param {RTCPeerConnection} connection - Peer connection to close
 */
export const closeConnection = (connection) => {
  if (!connection) return;
  
  try {
    // Close the connection
    connection.close();
    
    // Remove all event listeners
    connection.onicecandidate = null;
    connection.oniceconnectionstatechange = null;
    connection.ontrack = null;
    connection.onnegotiationneeded = null;
  } catch (error) {
    console.error('Error closing connection:', error);
  }
};

/**
 * Clean up recording resources
 * @param {RecordingHelper} recordingHelper - Recording helper instance
 */
export const cleanupRecordingResources = (recordingHelper) => {
  if (!recordingHelper) return;
  
  // Stop recording if active
  if (recordingHelper.isCurrentlyRecording()) {
    recordingHelper.stopRecording().catch(console.error);
  }
};

export default {
  cleanupWebRTCResources,
  stopAllStreams,
  closeConnection,
  cleanupRecordingResources
};
