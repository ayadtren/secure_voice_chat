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
