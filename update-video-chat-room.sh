#!/bin/bash

# Add ScreenShareButton import to VideoChatRoom.jsx
sed -i '' 's/import NetworkQualityIndicator from '\''\.\/NetworkQualityIndicator'\'';/import NetworkQualityIndicator from '\''\.\/NetworkQualityIndicator'\'';\nimport ScreenShareButton from '\''\.\/ScreenShareButton'\'';/' ./client/src/components/VideoChatRoom.jsx

# Add screen sharing state variables
sed -i '' 's/const \[networkMetrics, setNetworkMetrics\] = useState(null);/const \[networkMetrics, setNetworkMetrics\] = useState(null);\n  \n  \/\/ Phase 3 features - Screen sharing\n  const \[isScreenSharing, setIsScreenSharing\] = useState(false);\n  const \[screenStream, setScreenStream\] = useState(null);/' ./client/src/components/VideoChatRoom.jsx

# Add screen sharing change handler
cat >> ./client/src/components/VideoChatRoom.jsx << 'EOL'

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
EOL

# Add onScreenSharingChange to WebRTCManager options
sed -i '' 's/onNetworkQualityChange: handleNetworkQualityChange, \/\/ Phase 2 - Network quality monitoring/onNetworkQualityChange: handleNetworkQualityChange, \/\/ Phase 2 - Network quality monitoring\n      onScreenSharingChange: handleScreenSharingChange, \/\/ Phase 3 - Screen sharing/' ./client/src/components/VideoChatRoom.jsx

# Add ScreenShareButton to the UI
sed -i '' 's/<VideoQualityControls \n            currentQuality={currentVideoQuality}\n            onQualityChange={handleVideoQualityChange}\n          \/>/<VideoQualityControls \n            currentQuality={currentVideoQuality}\n            onQualityChange={handleVideoQualityChange}\n          \/>\n          \n          <ScreenShareButton \n            isScreenSharing={isScreenSharing}\n            onToggleScreenShare={handleToggleScreenShare}\n          \/>/' ./client/src/components/VideoChatRoom.jsx

echo "Updated VideoChatRoom with screen sharing functionality!"
