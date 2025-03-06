/**
 * QualityMonitor classes for monitoring WebRTC connection quality
 * Used by WebRTCManager to provide quality metrics and indicators
 */

/**
 * Base QualityMonitor class
 */
export class QualityMonitor {
  constructor(peerConnection, options = {}) {
    this.peerConnection = peerConnection;
    this.options = {
      interval: options.interval || 2000, // ms between checks
      qualityThresholds: {
        excellent: { packetLoss: 0.01, rtt: 150 },  // <1% loss, <150ms RTT
        good: { packetLoss: 0.03, rtt: 300 },       // <3% loss, <300ms RTT
        fair: { packetLoss: 0.08, rtt: 500 },       // <8% loss, <500ms RTT
        poor: { packetLoss: 0.15, rtt: 1000 },      // <15% loss, <1000ms RTT
        // anything worse is considered "bad"
      },
      ...options
    };
    
    this.stats = {
      rtt: null,
      jitter: null,
      packetLoss: null,
      bandwidth: null,
      timestamp: null,
      quality: 'unknown'
    };
    
    this.monitorInterval = null;
    this.onQualityChange = options.onQualityChange || (() => {});
  }

  /**
   * Start monitoring the connection quality
   */
  start() {
    if (this.monitorInterval) return;
    
    this.monitorInterval = setInterval(() => this._checkQuality(), this.options.interval);
  }

  /**
   * Stop monitoring the connection quality
   */
  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  /**
   * Check the connection quality using RTCPeerConnection stats
   */
  async _checkQuality() {
    if (!this.peerConnection) return;
    
    try {
      const stats = await this.peerConnection.getStats();
      const now = Date.now();
      
      let inboundRtp = null;
      let remoteOutboundRtp = null;
      let candidatePair = null;
      
      // Process the stats
      stats.forEach(stat => {
        if (stat.type === 'inbound-rtp' && !stat.isRemote && stat.mediaType === 'audio') {
          inboundRtp = stat;
        } else if (stat.type === 'remote-outbound-rtp' && stat.mediaType === 'audio') {
          remoteOutboundRtp = stat;
        } else if (stat.type === 'candidate-pair' && stat.nominated) {
          candidatePair = stat;
        }
      });
      
      // Calculate metrics
      let rtt = null;
      let jitter = null;
      let packetLoss = null;
      let bandwidth = null;
      
      if (candidatePair) {
        rtt = candidatePair.currentRoundTripTime ? candidatePair.currentRoundTripTime * 1000 : null;
      }
      
      if (inboundRtp) {
        jitter = inboundRtp.jitter ? inboundRtp.jitter * 1000 : null;
        
        // Calculate packet loss
        if (inboundRtp.packetsLost !== undefined && inboundRtp.packetsReceived !== undefined) {
          const totalPackets = inboundRtp.packetsLost + inboundRtp.packetsReceived;
          packetLoss = totalPackets > 0 ? inboundRtp.packetsLost / totalPackets : 0;
        }
        
        // Calculate bandwidth
        if (this.stats.timestamp && inboundRtp.bytesReceived !== undefined) {
          const bytesNow = inboundRtp.bytesReceived;
          const bytesLast = this.stats.bytesReceived || 0;
          const timeElapsed = (now - this.stats.timestamp) / 1000; // seconds
          
          if (timeElapsed > 0) {
            bandwidth = (bytesNow - bytesLast) * 8 / timeElapsed; // bits per second
          }
        }
        
        // Store bytes received for next calculation
        this.stats.bytesReceived = inboundRtp.bytesReceived;
      }
      
      // Determine quality level
      let quality = 'unknown';
      if (rtt !== null && packetLoss !== null) {
        const { qualityThresholds } = this.options;
        
        if (packetLoss <= qualityThresholds.excellent.packetLoss && 
            rtt <= qualityThresholds.excellent.rtt) {
          quality = 'excellent';
        } else if (packetLoss <= qualityThresholds.good.packetLoss && 
                  rtt <= qualityThresholds.good.rtt) {
          quality = 'good';
        } else if (packetLoss <= qualityThresholds.fair.packetLoss && 
                  rtt <= qualityThresholds.fair.rtt) {
          quality = 'fair';
        } else if (packetLoss <= qualityThresholds.poor.packetLoss && 
                  rtt <= qualityThresholds.poor.rtt) {
          quality = 'poor';
        } else {
          quality = 'bad';
        }
      }
      
      // Update stats
      const prevQuality = this.stats.quality;
      this.stats = {
        rtt,
        jitter,
        packetLoss,
        bandwidth,
        bytesReceived: inboundRtp?.bytesReceived,
        timestamp: now,
        quality
      };
      
      // Notify if quality changed
      if (quality !== prevQuality) {
        this.onQualityChange(quality, this.stats);
      }
      
    } catch (error) {
      console.error('Error getting connection stats:', error);
    }
  }

  /**
   * Get the current connection quality stats
   * @returns {Object} The current quality stats
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Get the current connection quality level
   * @returns {string} The quality level: 'excellent', 'good', 'fair', 'poor', 'bad', or 'unknown'
   */
  getQuality() {
    return this.stats.quality;
  }
}

/**
 * Audio-specific quality monitor with additional audio metrics
 */
export class AudioQualityMonitor extends QualityMonitor {
  constructor(peerConnection, options = {}) {
    super(peerConnection, options);
    
    // Additional audio-specific metrics
    this.stats = {
      ...this.stats,
      audioLevel: null,
      audioEnergy: null
    };
  }
  
  /**
   * Check audio quality with additional audio-specific metrics
   */
  async _checkQuality() {
    await super._checkQuality();
    
    if (!this.peerConnection) return;
    
    try {
      const stats = await this.peerConnection.getStats();
      
      stats.forEach(stat => {
        // Get audio level metrics
        if (stat.type === 'inbound-rtp' && !stat.isRemote && stat.mediaType === 'audio') {
          if (stat.audioLevel !== undefined) {
            this.stats.audioLevel = stat.audioLevel;
          }
          
          if (stat.totalAudioEnergy !== undefined) {
            this.stats.audioEnergy = stat.totalAudioEnergy;
          }
        }
      });
      
    } catch (error) {
      console.error('Error getting audio stats:', error);
    }
  }
  
  /**
   * Get the current audio level (0-1)
   * @returns {number|null} Audio level or null if not available
   */
  getAudioLevel() {
    return this.stats.audioLevel;
  }
}

// Export both classes as defaults for backward compatibility
export default {
  QualityMonitor,
  AudioQualityMonitor
};
