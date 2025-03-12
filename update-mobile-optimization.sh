#!/bin/bash

# Update WebRTCManager to use responsive helper for mobile optimization
sed -i '' 's/import { WebRTCQualityMonitor } from '\''\.\/webrtcQualityMonitor'\'';/import { WebRTCQualityMonitor } from '\''\.\/webrtcQualityMonitor'\'';\nimport { getOptimalVideoConstraints, isMobileDevice } from '\''\.\/responsiveHelper'\'';/' ./client/src/utils/webrtcManager.js

# Update setVideoQuality method to use responsive helper
sed -i '' 's/  async setVideoQuality(preset) {/  async setVideoQuality(preset) {\n    \/\/ Use responsive helper to get optimal constraints based on device and quality\n    const optimalConstraints = getOptimalVideoConstraints(preset);\n/' ./client/src/utils/webrtcManager.js

# Update video constraints in setVideoQuality method
sed -i '' 's/    switch (preset) {/    \/\/ For backward compatibility, keep the switch but use optimal constraints\n    let constraints = optimalConstraints;\n    \n    switch (preset) {/' ./client/src/utils/webrtcManager.js

# Update each quality preset to use optimal constraints
sed -i '' 's/        constraints = { width: 320, height: 240, frameRate: 15 };/        constraints = { ...optimalConstraints, width: { ideal: optimalConstraints.width }, height: { ideal: optimalConstraints.height }, frameRate: { ideal: optimalConstraints.frameRate } };/' ./client/src/utils/webrtcManager.js
sed -i '' 's/        constraints = { width: 640, height: 360, frameRate: 24 };/        constraints = { ...optimalConstraints, width: { ideal: optimalConstraints.width }, height: { ideal: optimalConstraints.height }, frameRate: { ideal: optimalConstraints.frameRate } };/' ./client/src/utils/webrtcManager.js
sed -i '' 's/        constraints = { width: 1280, height: 720, frameRate: 30 };/        constraints = { ...optimalConstraints, width: { ideal: optimalConstraints.width }, height: { ideal: optimalConstraints.height }, frameRate: { ideal: optimalConstraints.frameRate } };/' ./client/src/utils/webrtcManager.js
sed -i '' 's/        constraints = { width: 1920, height: 1080, frameRate: 30 };/        constraints = { ...optimalConstraints, width: { ideal: optimalConstraints.width }, height: { ideal: optimalConstraints.height }, frameRate: { ideal: optimalConstraints.frameRate } };/' ./client/src/utils/webrtcManager.js

# Update VideoChatRoom to use responsive helper
sed -i '' 's/import RecordingHelper from '\''\.\/\.\.\/utils\/recordingHelper'\'';/import RecordingHelper from '\''\.\/\.\.\/utils\/recordingHelper'\'';\nimport { getOptimalLayout, addOrientationChangeListener } from '\''\.\/\.\.\/utils\/responsiveHelper'\'';/' ./client/src/components/VideoChatRoom.jsx

# Add responsive layout state to VideoChatRoom
sed -i '' 's/const \[recordingTime, setRecordingTime\] = useState(0);\n  const recordingHelperRef = useRef(null);/const \[recordingTime, setRecordingTime\] = useState(0);\n  const recordingHelperRef = useRef(null);\n  \n  \/\/ Phase 3 features - Mobile optimization\n  const \[layout, setLayout\] = useState(getOptimalLayout());/' ./client/src/components/VideoChatRoom.jsx

# Add orientation change listener to VideoChatRoom
sed -i '' 's/  useEffect(() => {/  \/\/ Handle device orientation changes\n  useEffect(() => {\n    const removeListener = addOrientationChangeListener(() => {\n      setLayout(getOptimalLayout());\n    });\n    \n    return () => {\n      removeListener();\n    };\n  }, []);\n\n  useEffect(() => {/' ./client/src/components/VideoChatRoom.jsx

# Update getGridColumns function to use responsive layout
sed -i '' 's/  const getGridColumns = () => {/  const getGridColumns = () => {\n    \/\/ Use layout for responsive grid\n    if (layout.videoLayout === '\''stack'\'') {\n      return '\''grid-cols-1'\'';\n    }\n    /' ./client/src/components/VideoChatRoom.jsx

# Add mobile-specific styles to controls
sed -i '' 's/<div className="flex items-center space-x-4">/<div className={clsx(\n            "flex items-center", \n            layout.isMobile ? "space-x-2 flex-wrap justify-center" : "space-x-4"\n          )}>/' ./client/src/components/VideoChatRoom.jsx

echo "Updated application with mobile optimization!"
