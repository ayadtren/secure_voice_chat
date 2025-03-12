/**
 * WebRTC Adapter
 * Provides polyfills and compatibility fixes for WebRTC across different browsers
 */

/**
 * Initialize WebRTC adapter with polyfills
 * Must be called before any WebRTC operations
 */
export function initWebRTCAdapter() {
  // Check if navigator.mediaDevices exists
  if (!navigator.mediaDevices) {
    navigator.mediaDevices = {};
  }

  // Check if getUserMedia exists
  if (!navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia = function(constraints) {
      // First, try the legacy methods
      const getUserMedia = 
        navigator.webkitGetUserMedia || 
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;
      
      // If no getUserMedia exists, return a rejected promise
      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
      }

      // Otherwise, wrap the legacy method in a Promise
      return new Promise((resolve, reject) => {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }

  // Safari-specific fixes
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (isSafari) {
    // Fix for Safari not supporting certain WebRTC features
    window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
    window.RTCIceCandidate = window.RTCIceCandidate || window.webkitRTCIceCandidate;
    window.RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription;
  }

  // iOS-specific fixes
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS) {
    // iOS Safari requires special handling
    console.log('iOS device detected, applying WebRTC fixes');
  }

  return {
    isWebRTCSupported: checkWebRTCSupport(),
    isSafari,
    isIOS
  };
}

/**
 * Check if WebRTC is fully supported in this browser
 * @returns {boolean} Whether WebRTC is supported
 */
export function checkWebRTCSupport() {
  return !!(
    window.RTCPeerConnection &&
    window.RTCIceCandidate &&
    window.RTCSessionDescription &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );
}

/**
 * Get simplified audio constraints that work across browsers
 * @returns {Object} Browser-compatible audio constraints
 */
export function getCompatibleAudioConstraints() {
  // Start with basic constraints that work everywhere
  const basicConstraints = {
    audio: true,
    video: false
  };
  
  // Check if we can use more advanced constraints
  try {
    const isFirefox = navigator.userAgent.indexOf('Firefox') !== -1;
    const isChrome = navigator.userAgent.indexOf('Chrome') !== -1 && navigator.userAgent.indexOf('Edge') === -1;
    
    if (isChrome) {
      // Chrome supports more detailed constraints
      return {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      };
    } else if (isFirefox) {
      // Firefox has slightly different naming
      return {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      };
    }
  } catch (e) {
    console.warn('Error creating advanced audio constraints, falling back to basic', e);
  }
  
  return basicConstraints;
}

export default {
  initWebRTCAdapter,
  checkWebRTCSupport,
  getCompatibleAudioConstraints
};
