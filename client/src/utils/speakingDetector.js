/**
 * SpeakingDetector class for detecting when a user is speaking
 * Used by WebRTCManager to provide speaking indicators
 */
export class SpeakingDetector {
  constructor(stream, options = {}) {
    this.stream = stream;
    this.options = {
      threshold: options.threshold || -50, // dB threshold for speaking detection
      interval: options.interval || 100, // ms between checks
      minSpeakingTime: options.minSpeakingTime || 200, // ms of sound above threshold to be considered speaking
      speakingDecayTime: options.speakingDecayTime || 500, // ms of silence before considered not speaking
      ...options
    };
    
    this.speaking = false;
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.speakingStartTime = null;
    this.silenceStartTime = null;
    this.checkInterval = null;
    this.onSpeakingChange = options.onSpeakingChange || (() => {});
  }

  /**
   * Initialize the audio context and analyzer
   */
  _initAudio() {
    if (!this.stream) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.5;
      source.connect(this.analyser);
      
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
    } catch (error) {
      console.error('Failed to initialize audio analyzer:', error);
    }
  }

  /**
   * Calculate the volume level in dB from the frequency data
   * @returns {number} Volume level in dB
   */
  _getVolumeLevel() {
    if (!this.analyser || !this.dataArray) return -Infinity;
    
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Calculate the average volume
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.dataArray.length;
    
    // Convert to dB (0-255 scale to dB)
    // -100dB (silence) to 0dB (max volume)
    const dB = average === 0 ? -100 : 20 * Math.log10(average / 255);
    
    return dB;
  }

  /**
   * Check if the user is speaking based on volume level
   */
  _checkSpeaking() {
    const volumeLevel = this._getVolumeLevel();
    const now = Date.now();
    
    // Check if volume is above threshold
    if (volumeLevel > this.options.threshold) {
      if (!this.speakingStartTime) {
        this.speakingStartTime = now;
      }
      this.silenceStartTime = null;
      
      // If speaking for longer than minSpeakingTime, mark as speaking
      if (!this.speaking && now - this.speakingStartTime >= this.options.minSpeakingTime) {
        this.speaking = true;
        this.onSpeakingChange(true);
      }
    } else {
      // Volume is below threshold (silence)
      if (!this.silenceStartTime) {
        this.silenceStartTime = now;
      }
      
      // If silent for longer than speakingDecayTime, mark as not speaking
      if (this.speaking && this.silenceStartTime && 
          now - this.silenceStartTime >= this.options.speakingDecayTime) {
        this.speaking = false;
        this.speakingStartTime = null;
        this.onSpeakingChange(false);
      }
    }
  }

  /**
   * Start the speaking detector
   */
  start() {
    if (this.checkInterval) return;
    
    this._initAudio();
    this.checkInterval = setInterval(() => this._checkSpeaking(), this.options.interval);
  }

  /**
   * Stop the speaking detector
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    this.speaking = false;
    this.speakingStartTime = null;
    this.silenceStartTime = null;
  }

  /**
   * Check if the user is currently speaking
   * @returns {boolean} Whether the user is speaking
   */
  isSpeaking() {
    return this.speaking;
  }
}

// Also export as default for backward compatibility
export default SpeakingDetector;
