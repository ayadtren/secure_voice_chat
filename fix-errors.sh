#!/bin/bash

# Create the camera status helper file
cat > ./client/src/utils/cameraStatusHelper.js << 'EOL'
/**
 * Helper functions for camera status
 */

/**
 * Creates a camera status object
 * @param {string} status - Camera status (available, initializing, error)
 * @param {string} message - Status message
 * @returns {Object} Camera status object
 */
export const createCameraStatus = (status, message = '') => {
  return {
    status,
    message,
    timestamp: Date.now()
  };
};

export default {
  createCameraStatus
};
EOL

# Update the webrtcManager.js file to import the helper
sed -i '' '1s/^/import { createCameraStatus } from ".\/cameraStatusHelper";\n/' ./client/src/utils/webrtcManager.js

echo "Fixed errors in the codebase!"
