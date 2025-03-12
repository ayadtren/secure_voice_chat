/**
 * Browser detection and permission guidance utilities
 * Provides browser-specific instructions for microphone access
 */

/**
 * Detect the current browser
 * @returns {Object} Browser information including name and version
 */
export const detectBrowser = () => {
  const userAgent = navigator.userAgent;
  let browserName = "Unknown";
  let browserVersion = "Unknown";
  
  // Chrome
  if (/Chrome/.test(userAgent) && !/Chromium|Edge|Edg|OPR|Opera/.test(userAgent)) {
    browserName = "Chrome";
    browserVersion = userAgent.match(/Chrome\/(\d+\.\d+)/)?.[1] || "Unknown";
  } 
  // Firefox
  else if (/Firefox/.test(userAgent)) {
    browserName = "Firefox";
    browserVersion = userAgent.match(/Firefox\/(\d+\.\d+)/)?.[1] || "Unknown";
  } 
  // Safari
  else if (/Safari/.test(userAgent) && !/Chrome|Chromium|Edge|Edg|OPR|Opera/.test(userAgent)) {
    browserName = "Safari";
    browserVersion = userAgent.match(/Version\/(\d+\.\d+)/)?.[1] || "Unknown";
  } 
  // Edge (Chromium-based)
  else if (/Edg/.test(userAgent)) {
    browserName = "Edge";
    browserVersion = userAgent.match(/Edg\/(\d+\.\d+)/)?.[1] || "Unknown";
  } 
  // Opera
  else if (/OPR|Opera/.test(userAgent)) {
    browserName = "Opera";
    browserVersion = userAgent.match(/(?:OPR|Opera)\/(\d+\.\d+)/)?.[1] || "Unknown";
  }
  
  // Check if running on mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  
  return {
    name: browserName,
    version: browserVersion,
    isMobile,
    isIOS,
    isAndroid
  };
};

/**
 * Get browser-specific instructions for microphone permissions
 * @returns {Object} Instructions for the current browser
 */
export const getMicrophonePermissionInstructions = () => {
  const browser = detectBrowser();
  
  // Default instructions
  let instructions = "Please allow microphone access in your browser settings and reload the page.";
  
  // Chrome/Chromium-based browsers
  if (browser.name === "Chrome" || browser.name === "Edge" || browser.name === "Opera") {
    if (browser.isMobile) {
      if (browser.isAndroid) {
        instructions = "Tap the lock icon in the address bar, then tap 'Site settings' and allow microphone access. Reload the page after changing permissions.";
      } else if (browser.isIOS) {
        instructions = "iOS Chrome requires microphone permissions to be granted in iOS Settings. Go to Settings > Chrome > Microphone and enable access.";
      }
    } else {
      instructions = "Click the lock/info icon in the address bar, select 'Site settings', and set Microphone to 'Allow'. Reload the page after changing permissions.";
    }
  } 
  // Firefox
  else if (browser.name === "Firefox") {
    if (browser.isMobile) {
      instructions = "Tap the lock icon in the address bar, tap 'Edit Site Settings', and allow microphone access. Reload the page after changing permissions.";
    } else {
      instructions = "Click the lock icon in the address bar, click the right arrow (>) next to Connection secure, select 'More Information', go to 'Permissions', and allow microphone access. Reload the page after changing permissions.";
    }
  } 
  // Safari
  else if (browser.name === "Safari") {
    if (browser.isMobile) {
      instructions = "Go to iOS Settings > Safari > Microphone and ensure it's enabled. Then reload this page.";
    } else {
      instructions = "Click Safari > Settings for This Website... (or Preferences > Websites > Microphone) and allow microphone access for this site. Reload the page after changing permissions.";
    }
  }
  
  return {
    browser: browser.name,
    version: browser.version,
    isMobile: browser.isMobile,
    instructions
  };
};

/**
 * Get browser-specific instructions for camera permissions
 * @returns {Object} Instructions for the current browser
 */
export const getCameraPermissionInstructions = () => {
  const browser = detectBrowser();
  
  // Default instructions
  let instructions = "Please allow camera access in your browser settings and reload the page.";
  
  // Chrome/Chromium-based browsers
  if (browser.name === "Chrome" || browser.name === "Edge" || browser.name === "Opera") {
    if (browser.isMobile) {
      if (browser.isAndroid) {
        instructions = "Tap the lock icon in the address bar, then tap 'Site settings' and allow camera access. Reload the page after changing permissions.";
      } else if (browser.isIOS) {
        instructions = "iOS Chrome requires camera permissions to be granted in iOS Settings. Go to Settings > Chrome > Camera and enable access.";
      }
    } else {
      instructions = "Click the lock/info icon in the address bar, select 'Site settings', and set Camera to 'Allow'. Reload the page after changing permissions.";
    }
  } 
  // Firefox
  else if (browser.name === "Firefox") {
    if (browser.isMobile) {
      instructions = "Tap the lock icon in the address bar, tap 'Edit Site Settings', and allow camera access. Reload the page after changing permissions.";
    } else {
      instructions = "Click the lock icon in the address bar, click the right arrow (>) next to Connection secure, select 'More Information', go to 'Permissions', and allow camera access. Reload the page after changing permissions.";
    }
  } 
  // Safari
  else if (browser.name === "Safari") {
    if (browser.isMobile) {
      instructions = "Go to iOS Settings > Safari > Camera and ensure it's enabled. Then reload this page.";
    } else {
      instructions = "Click Safari > Settings for This Website... (or Preferences > Websites > Camera) and allow camera access for this site. Reload the page after changing permissions.";
    }
  }
  
  return {
    browser: browser.name,
    version: browser.version,
    isMobile: browser.isMobile,
    instructions
  };
};

/**
 * Create a detailed microphone status object with browser-specific guidance
 * @param {string} status - The status of microphone access ('denied', 'requesting', etc.)
 * @param {string} errorMessage - Optional error message from getUserMedia
 * @returns {Object} Detailed status object with browser-specific instructions
 */
export const createMicrophoneStatus = (status, errorMessage = null) => {
  const permissionInfo = getMicrophonePermissionInstructions();
  
  let message = '';
  let instructions = '';
  
  switch (status) {
    case 'requesting':
      message = 'Requesting Microphone Access';
      instructions = 'Please allow microphone access when prompted by your browser.';
      break;
    case 'denied':
      message = 'Microphone Access Denied';
      instructions = permissionInfo.instructions;
      break;
    case 'unavailable':
      message = 'Microphone Unavailable';
      instructions = 'No microphone detected or your microphone is being used by another application.';
      break;
    case 'error':
      message = 'Microphone Error';
      instructions = errorMessage || 'An error occurred while accessing your microphone.';
      break;
    case 'granted':
      message = 'Microphone Access Granted';
      instructions = 'Your microphone is now connected and working.';
      break;
    default:
      message = 'Microphone Status Unknown';
      instructions = 'Please ensure your browser has microphone access.';
  }
  
  return {
    status,
    message,
    instructions,
    browser: permissionInfo.browser,
    isMobile: permissionInfo.isMobile,
    errorDetails: errorMessage
  };
};

/**
 * Create a detailed camera status object with browser-specific guidance
 * @param {string} status - The status of camera access ('denied', 'requesting', etc.)
 * @param {string} errorMessage - Optional error message from getUserMedia
 * @returns {Object} Detailed status object with browser-specific instructions
 */
export const createCameraStatus = (status, errorMessage = null) => {
  const permissionInfo = getCameraPermissionInstructions();
  
  let message = '';
  let instructions = '';
  
  switch (status) {
    case 'requesting':
      message = 'Requesting Camera Access';
      instructions = 'Please allow camera access when prompted by your browser.';
      break;
    case 'denied':
      message = 'Camera Access Denied';
      instructions = permissionInfo.instructions;
      break;
    case 'unavailable':
      message = 'Camera Unavailable';
      instructions = 'No camera detected or your camera is being used by another application.';
      break;
    case 'error':
      message = 'Camera Error';
      instructions = errorMessage || 'An error occurred while accessing your camera.';
      break;
    case 'granted':
      message = 'Camera Access Granted';
      instructions = 'Your camera is now connected and working.';
      break;
    default:
      message = 'Camera Status Unknown';
      instructions = 'Please ensure your browser has camera access.';
  }
  
  return {
    status,
    message,
    instructions,
    browser: permissionInfo.browser,
    isMobile: permissionInfo.isMobile,
    errorDetails: errorMessage
  };
};

export default {
  detectBrowser,
  getMicrophonePermissionInstructions,
  getCameraPermissionInstructions,
  createMicrophoneStatus,
  createCameraStatus
};
