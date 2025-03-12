/**
 * Recording helper for WebRTC video chat
 * Provides functionality to record video streams
 */

class RecordingHelper {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.startTime = 0;
    this.recordingTimer = null;
    this.onRecordingTimeUpdate = null;
  }

  /**
   * Start recording video streams
   * @param {MediaStream[]} streams - Array of media streams to record
   * @param {Function} onTimeUpdate - Callback for recording time updates
   * @returns {Promise<boolean>} Success status
   */
  startRecording(streams, onTimeUpdate = null) {
    if (this.isRecording) {
      return false;
    }

    try {
      // Combine all streams into one
      const combinedStream = this._combineStreams(streams);
      
      // Create media recorder
      this.mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: this._getSupportedMimeType(),
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });
      
      // Set up event handlers
      this.recordedChunks = [];
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
      
      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;
      this.startTime = Date.now();
      this.onRecordingTimeUpdate = onTimeUpdate;
      
      // Start timer for recording duration
      this._startRecordingTimer();
      
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      return false;
    }
  }

  /**
   * Stop recording
   * @returns {Promise<Blob>} Recorded video blob
   */
  async stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.isRecording || !this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      // Stop the recording timer
      this._stopRecordingTimer();
      
      // Handle recording completion
      this.mediaRecorder.onstop = () => {
        try {
          // Create blob from recorded chunks
          const blob = new Blob(this.recordedChunks, {
            type: this._getSupportedMimeType()
          });
          
          this.isRecording = false;
          this.recordedChunks = [];
          this.mediaRecorder = null;
          
          resolve(blob);
        } catch (error) {
          reject(error);
        }
      };
      
      // Stop the media recorder
      this.mediaRecorder.stop();
    });
  }

  /**
   * Download recorded video
   * @param {Blob} blob - Video blob to download
   * @param {string} filename - Name for the downloaded file
   */
  downloadRecording(blob, filename = 'recorded-video') {
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
    
    // Trigger download
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Get recording status
   * @returns {boolean} Recording status
   */
  isCurrentlyRecording() {
    return this.isRecording;
  }

  /**
   * Get recording duration in seconds
   * @returns {number} Recording duration
   */
  getRecordingDuration() {
    if (!this.isRecording || !this.startTime) {
      return 0;
    }
    
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Start recording timer
   * @private
   */
  _startRecordingTimer() {
    this.recordingTimer = setInterval(() => {
      if (this.onRecordingTimeUpdate) {
        this.onRecordingTimeUpdate(this.getRecordingDuration());
      }
    }, 1000);
  }

  /**
   * Stop recording timer
   * @private
   */
  _stopRecordingTimer() {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  /**
   * Combine multiple media streams into one
   * @param {MediaStream[]} streams - Array of media streams
   * @returns {MediaStream} Combined stream
   * @private
   */
  _combineStreams(streams) {
    // Filter out null or undefined streams
    const validStreams = streams.filter(stream => stream);
    
    if (validStreams.length === 0) {
      throw new Error('No valid streams to record');
    }
    
    if (validStreams.length === 1) {
      return validStreams[0];
    }
    
    // Combine audio and video tracks from all streams
    const combinedTracks = [];
    
    validStreams.forEach(stream => {
      stream.getTracks().forEach(track => {
        combinedTracks.push(track);
      });
    });
    
    return new MediaStream(combinedTracks);
  }

  /**
   * Get supported MIME type for recording
   * @returns {string} Supported MIME type
   * @private
   */
  _getSupportedMimeType() {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return 'video/webm'; // Default fallback
  }
}

export default RecordingHelper;
