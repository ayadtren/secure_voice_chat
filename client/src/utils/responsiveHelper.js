/**
 * Responsive design helper for mobile optimization
 */

/**
 * Check if the current device is mobile
 * @returns {boolean} True if mobile device
 */
export const isMobileDevice = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  // Check for mobile device patterns in user agent
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  
  return mobileRegex.test(userAgent) || window.innerWidth < 768;
};

/**
 * Get optimal video constraints for the current device
 * @param {string} quality - Quality preset (low, medium, high, hd, auto)
 * @returns {Object} Video constraints
 */
export const getOptimalVideoConstraints = (quality = 'auto') => {
  const isMobile = isMobileDevice();
  
  // Default constraints based on device type
  const defaultConstraints = isMobile ? 
    { width: 640, height: 360, frameRate: 24 } : // Mobile
    { width: 1280, height: 720, frameRate: 30 }; // Desktop
  
  // Return constraints based on quality preset
  switch (quality) {
    case 'low':
      return { width: 320, height: 240, frameRate: 15 };
    case 'medium':
      return { width: 640, height: 360, frameRate: 24 };
    case 'high':
      return { width: 1280, height: 720, frameRate: 30 };
    case 'hd':
      return { width: 1920, height: 1080, frameRate: 30 };
    case 'auto':
    default:
      return defaultConstraints;
  }
};

/**
 * Get optimal layout for the current device
 * @returns {Object} Layout configuration
 */
export const getOptimalLayout = () => {
  const isMobile = isMobileDevice();
  const isLandscape = window.innerWidth > window.innerHeight;
  
  return {
    isMobile,
    isLandscape,
    controlsLayout: isMobile ? 'compact' : 'standard',
    videoLayout: isMobile && !isLandscape ? 'stack' : 'grid'
  };
};

/**
 * Add device orientation change listener
 * @param {Function} callback - Function to call on orientation change
 * @returns {Function} Function to remove the listener
 */
export const addOrientationChangeListener = (callback) => {
  const handler = () => {
    callback(window.innerWidth > window.innerHeight);
  };
  
  window.addEventListener('resize', handler);
  
  return () => {
    window.removeEventListener('resize', handler);
  };
};

export default {
  isMobileDevice,
  getOptimalVideoConstraints,
  getOptimalLayout,
  addOrientationChangeListener
};
