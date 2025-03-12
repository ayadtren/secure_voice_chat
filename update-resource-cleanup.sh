#!/bin/bash

# Update VideoChatRoom to import resource cleanup helper
sed -i '' 's/import { getOptimalLayout, addOrientationChangeListener } from '\''\.\/\.\.\/utils\/responsiveHelper'\'';/import { getOptimalLayout, addOrientationChangeListener } from '\''\.\/\.\.\/utils\/responsiveHelper'\'';\nimport { cleanupWebRTCResources, cleanupRecordingResources } from '\''\.\/\.\.\/utils\/resourceCleanupHelper'\'';/' ./client/src/components/VideoChatRoom.jsx

# Update handleLeaveRoom function to use resource cleanup helper
sed -i '' 's/  const handleLeaveRoom = () => {/  const handleLeaveRoom = () => {\n    \/\/ Clean up WebRTC resources\n    if (webrtcManagerRef.current) {\n      cleanupWebRTCResources(webrtcManagerRef.current);\n    }\n    \n    \/\/ Clean up recording resources\n    if (recordingHelperRef.current) {\n      cleanupRecordingResources(recordingHelperRef.current);\n    }\n/' ./client/src/components/VideoChatRoom.jsx

# Add cleanup in useEffect for component unmount
sed -i '' 's/  \/\/ Cleanup on unmount\n  useEffect(() => {\n    return () => {\n      if (webrtcManager) {\n        webrtcManager.disconnect();\n      }\n    };\n  }, \[webrtcManager\]);/  \/\/ Cleanup on unmount\n  useEffect(() => {\n    return () => {\n      if (webrtcManager) {\n        \/\/ Disconnect from signaling server\n        webrtcManager.disconnect();\n        \n        \/\/ Clean up WebRTC resources\n        cleanupWebRTCResources(webrtcManager);\n      }\n      \n      \/\/ Clean up recording resources\n      if (recordingHelperRef.current) {\n        cleanupRecordingResources(recordingHelperRef.current);\n      }\n    };\n  }, \[webrtcManager\]);/' ./client/src/components/VideoChatRoom.jsx

# Update WebRTCManager to add proper cleanup in disconnect method
sed -i '' 's/  disconnect() {/  disconnect() {\n    \/\/ Stop all local streams\n    if (this.localStream) {\n      this.localStream.getTracks().forEach(track => track.stop());\n      this.localStream = null;\n    }\n    \n    if (this.localVideoStream) {\n      this.localVideoStream.getTracks().forEach(track => track.stop());\n      this.localVideoStream = null;\n    }\n    \n    if (this.localScreenStream) {\n      this.localScreenStream.getTracks().forEach(track => track.stop());\n      this.localScreenStream = null;\n      this.isScreenSharing = false;\n    }\n    \n    \/\/ Close all peer connections\n    for (const \[peerId, peerConnection\] of this.peerConnections.entries()) {\n      if (peerConnection) {\n        peerConnection.close();\n      }\n    }\n    \n    this.peerConnections.clear();\n    this.audioQualityMonitors.clear();\n/' ./client/src/utils/webrtcManager.js

echo "Updated application with proper resource cleanup!"
