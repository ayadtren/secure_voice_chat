/**
 * WebRTC Quality Monitor
 * 
 * Monitors WebRTC connection quality and provides adaptive streaming capabilities
 */
export class WebRTCQualityMonitor {
  /**
   * Create a new WebRTC Quality Monitor
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Quality presets
    this.qualityPresets = {
      low: {
        id: 'low',
        width: 640,
        height: 360,
        frameRate: 15,
        bitrate: 400000
      },
      medium: {
        id: 'medium',
        width: 854,
        height: 480,
        frameRate: 24,
        bitrate: 800000
      },
      high: {
        id: 'high',
        width: 1280,
        height: 720,
        frameRate: 30,
        bitrate: 1500000
      },
      hd: {
        id: 'hd',
        width: 1920,
        height: 1080,
        frameRate: 30,
        bitrate: 3000000
      }
    };
    
    // Current quality setting
    this.currentQuality = options.initialQuality || 'high';
    this.adaptiveQuality = options.adaptiveQuality !== false;
    
    // Callbacks
    this.onQualityChange = options.onQualityChange || null;
    this.onNetworkQualityChange = options.onNetworkQualityChange || null;
    
    // Stats
    this.lastStats = {};
    this.networkQuality = 100;
    this.monitorInterval = null;
  }
  
  /**
   * Start monitoring network quality
   * @param {RTCPeerConnection} peerConnection - WebRTC peer connection to monitor
   * @param {string} peerId - ID of the peer
   */
  startMonitoring(peerConnection, peerId) {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    
    this.monitorInterval = setInterval(async () => {
      try {
        if (!peerConnection) return;
        
        // Get connection stats
        const stats = await peerConnection.getStats();
        const videoStats = {};
        const connectionStats = {};
        
        stats.forEach(stat => {
          // Collect video stats
          if (stat.type === 'outbound-rtp' && stat.kind === 'video') {
            videoStats.bytesSent = stat.bytesSent;
            videoStats.packetsSent = stat.packetsSent;
            videoStats.framesEncoded = stat.framesEncoded;
            videoStats.framesSent = stat.framesSent;
            videoStats.timestamp = stat.timestamp;
          }
          
          // Collect connection stats
          if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
            connectionStats.currentRoundTripTime = stat.currentRoundTripTime;
            connectionStats.availableOutgoingBitrate = stat.availableOutgoingBitrate;
            connectionStats.timestamp = stat.timestamp;
          }
        });
        
        // Calculate network quality
        if (this.lastStats.timestamp) {
          // Calculate bitrate
          const timeDiff = (videoStats.timestamp - this.lastStats.timestamp) / 1000;
          const bytesSent = videoStats.bytesSent - this.lastStats.bytesSent;
          const bitrate = (bytesSent * 8) / timeDiff; // bps
          
          // Calculate packet loss
          const packetsSent = videoStats.packetsSent - this.lastStats.packetsSent;
          const packetLoss = 0; // TODO: Calculate actual packet loss
          
          // Calculate frame rate
          const framesSent = videoStats.framesSent - this.lastStats.framesSent;
          const frameRate = framesSent / timeDiff;
          
          // Calculate round trip time (in ms)
          const rtt = connectionStats.currentRoundTripTime * 1000;
          
          // Calculate overall quality score (0-100)
          let qualityScore = 100;
          
          // Reduce score based on RTT
          if (rtt > 500) qualityScore -= 40;
          else if (rtt > 300) qualityScore -= 25;
          else if (rtt > 150) qualityScore -= 10;
          else if (rtt > 100) qualityScore -= 5;
          
          // Reduce score based on bitrate
          const targetBitrate = this.qualityPresets[this.currentQuality]?.bitrate || 1500000;
          if (bitrate < targetBitrate * 0.3) qualityScore -= 40;
          else if (bitrate < targetBitrate * 0.5) qualityScore -= 25;
          else if (bitrate < targetBitrate * 0.7) qualityScore -= 10;
          
          // Reduce score based on frame rate
          const targetFrameRate = this.qualityPresets[this.currentQuality]?.frameRate || 30;
          if (frameRate < targetFrameRate * 0.3) qualityScore -= 30;
          else if (frameRate < targetFrameRate * 0.5) qualityScore -= 20;
          else if (frameRate < targetFrameRate * 0.7) qualityScore -= 10;
          
          // Ensure score is between 0-100
          qualityScore = Math.max(0, Math.min(100, qualityScore));
          
          // Update network quality
          this.networkQuality = qualityScore;
          
          // Notify about quality change
          if (this.onNetworkQualityChange) {
            this.onNetworkQualityChange(peerId, qualityScore, {
              bitrate,
              rtt,
              frameRate,
              packetLoss
            });
          }
          
          // Apply adaptive quality if enabled
          if (this.adaptiveQuality) {
            this.adaptVideoQuality(qualityScore, bitrate, rtt);
          }
        }
        
        // Store current stats for next comparison
        this.lastStats = {
          ...videoStats,
          ...connectionStats
        };
      } catch (error) {
        console.warn('Error monitoring network quality:', error);
      }
    }, 2000); // Check every 2 seconds
  }
  
  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }
  
  /**
   * Adapt video quality based on network conditions
   * @param {number} qualityScore - Overall quality score (0-100)
   * @param {number} bitrate - Current bitrate in bps
   * @param {number} rtt - Round trip time in ms
   */
  adaptVideoQuality(qualityScore, bitrate, rtt) {
    try {
      let targetQuality;
      
      // Determine target quality based on network conditions
      if (qualityScore < 30 || rtt > 300) {
        targetQuality = 'low';
      } else if (qualityScore < 60 || rtt > 150) {
        targetQuality = 'medium';
      } else if (qualityScore < 85 || rtt > 100) {
        targetQuality = 'high';
      } else {
        targetQuality = 'hd';
      }
      
      // Only change quality if it's different from current
      if (targetQuality !== this.currentQuality) {
        console.log(`Adapting video quality to ${targetQuality} due to network conditions`);
        this.setQuality(targetQuality);
      }
    } catch (error) {
      console.warn('Error adapting video quality:', error);
    }
  }
  
  /**
   * Set video quality preset
   * @param {string|Object} preset - Quality preset id or custom preset object
   * @returns {Object} - The quality settings
   */
  setQuality(preset) {
    try {
      let qualitySettings;
      
      if (typeof preset === 'string') {
        // Use predefined preset
        qualitySettings = this.qualityPresets[preset];
        if (!qualitySettings) {
          throw new Error(`Unknown quality preset: ${preset}`);
        }
        this.currentQuality = preset;
      } else if (typeof preset === 'object') {
        // Use custom settings
        qualitySettings = preset;
        this.currentQuality = 'custom';
      } else {
        throw new Error('Invalid quality preset');
      }
      
      // If preset is 'auto', enable adaptive quality
      if (preset === 'auto') {
        this.adaptiveQuality = true;
        return null;
      }
      
      this.adaptiveQuality = false;
      
      // Notify about quality change
      if (this.onQualityChange) {
        this.onQualityChange(qualitySettings);
      }
      
      return qualitySettings;
    } catch (error) {
      console.error('Error setting video quality:', error);
      return null;
    }
  }
  
  /**
   * Get current quality settings
   * @returns {Object} - Current quality settings
   */
  getCurrentQuality() {
    return this.qualityPresets[this.currentQuality] || null;
  }
  
  /**
   * Get all available quality presets
   * @returns {Object} - Quality presets
   */
  getQualityPresets() {
    return this.qualityPresets;
  }
}
