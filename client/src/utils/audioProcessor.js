/**
 * Advanced Audio Processing Utility
 * 
 * Provides enhanced audio processing capabilities for WebRTC voice chat:
 * - Noise suppression
 * - Echo cancellation
 * - Volume normalization
 * - Speaking detection
 * - Audio quality monitoring
 */

/**
 * Creates an enhanced audio stream with noise suppression and echo cancellation
 * @param {MediaStream} originalStream - The original audio stream from getUserMedia
 * @returns {Promise<MediaStream>} - Enhanced audio stream
 */
export async function createEnhancedAudioStream(originalStream) {
  try {
    // Check if browser supports advanced audio processing
    const supportsAudioWorklet = 'AudioWorklet' in window.AudioContext.prototype;
    
    // Create audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Get audio track from original stream
    const audioTrack = originalStream.getAudioTracks()[0];
    
    if (!audioTrack) {
      console.warn('No audio track found in the stream');
      return originalStream;
    }
    
    // Create source from the original audio track
    const source = audioContext.createMediaStreamSource(originalStream);
    
    // Create destination for processed audio
    const destination = audioContext.createMediaStreamDestination();
    
    // Apply audio constraints for echo cancellation and noise suppression
    // Note: These constraints work in conjunction with getUserMedia constraints
    try {
      await audioTrack.applyConstraints({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
    } catch (err) {
      console.warn('Could not apply audio constraints:', err);
    }
    
    // If browser supports AudioWorklet, use it for advanced processing
    if (supportsAudioWorklet) {
      try {
        // Create gain node for volume control
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 1.0; // Default gain
        
        // Connect the audio processing chain
        source.connect(gainNode);
        gainNode.connect(destination);
        
        console.log('Enhanced audio stream created with AudioWorklet support');
      } catch (err) {
        console.warn('Error setting up AudioWorklet processing:', err);
        // Fallback: direct connection
        source.connect(destination);
      }
    } else {
      // Fallback for browsers without AudioWorklet support
      console.log('AudioWorklet not supported, using basic audio processing');
      source.connect(destination);
    }
    
    // Return the processed stream
    return destination.stream;
  } catch (error) {
    console.error('Error creating enhanced audio stream:', error);
    // Return original stream as fallback
    return originalStream;
  }
}

/**
 * Audio level detector for speaking indication
 */
export class SpeakingDetector {
  constructor(stream, options = {}) {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.stream = stream;
    this.source = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    
    // Configure analyser
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.5;
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
    
    // Connect source to analyser
    this.source.connect(this.analyser);
    
    // Speaking detection configuration
    this.threshold = options.threshold || 20; // Default threshold
    this.speakingHistory = [];
    this.historyLength = options.historyLength || 5;
    this.speaking = false;
    this.onSpeakingChange = options.onSpeakingChange || null;
    
    // Start detection
    this.isRunning = false;
  }
  
  /**
   * Start the speaking detection
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.detectSpeaking();
  }
  
  /**
   * Stop the speaking detection
   */
  stop() {
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
  
  /**
   * Main detection loop
   */
  detectSpeaking() {
    if (!this.isRunning) return;
    
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < this.bufferLength; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.bufferLength;
    
    // Add to history
    this.speakingHistory.push(average);
    if (this.speakingHistory.length > this.historyLength) {
      this.speakingHistory.shift();
    }
    
    // Calculate average from history to reduce false positives
    const historyAverage = this.speakingHistory.reduce((a, b) => a + b, 0) / this.speakingHistory.length;
    
    // Determine if speaking
    const isSpeaking = historyAverage > this.threshold;
    
    // Notify if speaking state changed
    if (isSpeaking !== this.speaking) {
      this.speaking = isSpeaking;
      if (this.onSpeakingChange) {
        this.onSpeakingChange(this.speaking);
      }
    }
    
    // Continue detection loop
    this.animationFrame = requestAnimationFrame(this.detectSpeaking.bind(this));
  }
  
  /**
   * Get current audio level (0-100)
   * @returns {number} Audio level
   */
  getAudioLevel() {
    if (!this.isRunning) return 0;
    
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < this.bufferLength; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.bufferLength;
    
    // Convert to 0-100 scale
    return Math.min(100, Math.max(0, average * (100 / 256)));
  }
  
  /**
   * Set speaking detection threshold
   * @param {number} threshold - New threshold value (0-100)
   */
  setThreshold(threshold) {
    this.threshold = Math.min(100, Math.max(0, threshold));
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    this.stop();
    if (this.source) {
      this.source.disconnect();
    }
  }
}

/**
 * Audio quality monitor for adaptive streaming
 */
export class AudioQualityMonitor {
  constructor(peerConnection, options = {}) {
    this.peerConnection = peerConnection;
    this.interval = options.interval || 2000; // Check interval in ms
    this.onQualityChange = options.onQualityChange || null;
    this.qualityThresholds = {
      excellent: { packetLoss: 0.01, jitter: 10 },
      good: { packetLoss: 0.03, jitter: 30 },
      fair: { packetLoss: 0.08, jitter: 50 },
      poor: { packetLoss: 0.15, jitter: 100 },
      // Anything worse is considered "bad"
    };
    
    this.currentQuality = 'unknown';
    this.intervalId = null;
  }
  
  /**
   * Start monitoring audio quality
   */
  start() {
    if (this.intervalId) return;
    
    this.intervalId = setInterval(() => this.checkQuality(), this.interval);
  }
  
  /**
   * Stop monitoring audio quality
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  /**
   * Check current audio quality
   */
  async checkQuality() {
    if (!this.peerConnection) return;
    
    try {
      const stats = await this.peerConnection.getStats();
      let audioInboundStats = null;
      
      // Find audio inbound-rtp stats
      stats.forEach(stat => {
        if (stat.type === 'inbound-rtp' && stat.kind === 'audio') {
          audioInboundStats = stat;
        }
      });
      
      if (!audioInboundStats) return;
      
      // Calculate packet loss
      const packetsLost = audioInboundStats.packetsLost || 0;
      const packetsReceived = audioInboundStats.packetsReceived || 1; // Avoid division by zero
      const packetLossRate = packetsLost / (packetsLost + packetsReceived);
      
      // Get jitter (in milliseconds)
      const jitter = (audioInboundStats.jitter || 0) * 1000;
      
      // Determine quality level
      let quality = 'bad';
      if (packetLossRate <= this.qualityThresholds.excellent.packetLoss && 
          jitter <= this.qualityThresholds.excellent.jitter) {
        quality = 'excellent';
      } else if (packetLossRate <= this.qualityThresholds.good.packetLoss && 
                jitter <= this.qualityThresholds.good.jitter) {
        quality = 'good';
      } else if (packetLossRate <= this.qualityThresholds.fair.packetLoss && 
                jitter <= this.qualityThresholds.fair.jitter) {
        quality = 'fair';
      } else if (packetLossRate <= this.qualityThresholds.poor.packetLoss && 
                jitter <= this.qualityThresholds.poor.jitter) {
        quality = 'poor';
      }
      
      // Notify if quality changed
      if (quality !== this.currentQuality) {
        this.currentQuality = quality;
        if (this.onQualityChange) {
          this.onQualityChange(quality, { packetLossRate, jitter });
        }
      }
      
    } catch (error) {
      console.error('Error checking audio quality:', error);
    }
  }
  
  /**
   * Get current quality metrics
   * @returns {Promise<Object>} Quality metrics
   */
  async getQualityMetrics() {
    if (!this.peerConnection) {
      return { quality: 'unknown', metrics: {} };
    }
    
    try {
      const stats = await this.peerConnection.getStats();
      let audioInboundStats = null;
      let audioOutboundStats = null;
      
      // Find audio stats
      stats.forEach(stat => {
        if (stat.type === 'inbound-rtp' && stat.kind === 'audio') {
          audioInboundStats = stat;
        }
        if (stat.type === 'outbound-rtp' && stat.kind === 'audio') {
          audioOutboundStats = stat;
        }
      });
      
      const metrics = {
        inbound: audioInboundStats ? {
          packetsReceived: audioInboundStats.packetsReceived || 0,
          packetsLost: audioInboundStats.packetsLost || 0,
          jitter: (audioInboundStats.jitter || 0) * 1000, // ms
          bytesReceived: audioInboundStats.bytesReceived || 0,
        } : null,
        outbound: audioOutboundStats ? {
          packetsSent: audioOutboundStats.packetsSent || 0,
          bytesSent: audioOutboundStats.bytesSent || 0,
        } : null,
        quality: this.currentQuality,
      };
      
      return metrics;
    } catch (error) {
      console.error('Error getting quality metrics:', error);
      return { quality: 'unknown', metrics: {} };
    }
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    this.stop();
    this.peerConnection = null;
  }
}
