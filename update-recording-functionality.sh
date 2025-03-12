#!/bin/bash

# Add RecordButton import to VideoChatRoom.jsx
sed -i '' 's/import ScreenShareButton from '\''\.\/ScreenShareButton'\'';/import ScreenShareButton from '\''\.\/ScreenShareButton'\'';\nimport RecordButton from '\''\.\/RecordButton'\'';\nimport RecordingHelper from '\''\.\/\.\.\/utils\/recordingHelper'\'';/' ./client/src/components/VideoChatRoom.jsx

# Add recording state variables
sed -i '' 's/const \[isScreenSharing, setIsScreenSharing\] = useState(false);\n  const \[screenStream, setScreenStream\] = useState(null);/const \[isScreenSharing, setIsScreenSharing\] = useState(false);\n  const \[screenStream, setScreenStream\] = useState(null);\n  \n  \/\/ Phase 3 features - Recording\n  const \[isRecording, setIsRecording\] = useState(false);\n  const \[recordingTime, setRecordingTime\] = useState(0);\n  const recordingHelperRef = useRef(null);/' ./client/src/components/VideoChatRoom.jsx

# Add recording helper initialization
sed -i '' 's/const webrtcManagerRef = useRef(null);/const webrtcManagerRef = useRef(null);\n  \n  \/\/ Initialize recording helper\n  if (!recordingHelperRef.current) {\n    recordingHelperRef.current = new RecordingHelper();\n  }/' ./client/src/components/VideoChatRoom.jsx

# Add recording handlers
cat >> ./client/src/components/VideoChatRoom.jsx << 'EOL'

  // Handle recording time update
  const handleRecordingTimeUpdate = (time) => {
    setRecordingTime(time);
  };

  // Handle toggle recording
  const handleToggleRecording = async () => {
    const recordingHelper = recordingHelperRef.current;
    
    if (!recordingHelper) {
      return;
    }
    
    if (recordingHelper.isCurrentlyRecording()) {
      try {
        // Stop recording
        const recordedBlob = await recordingHelper.stopRecording();
        
        // Download the recording
        recordingHelper.downloadRecording(recordedBlob, `video-chat-${roomId}`);
        
        // Update state
        setIsRecording(false);
        setRecordingTime(0);
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    } else {
      // Start recording
      const streamsToRecord = [localVideoStream];
      
      // Add remote streams
      Object.values(remoteVideoStreams).forEach(stream => {
        if (stream) {
          streamsToRecord.push(stream);
        }
      });
      
      // Add screen sharing stream if active
      if (isScreenSharing && screenStream) {
        streamsToRecord.push(screenStream);
      }
      
      // Start recording
      const success = recordingHelper.startRecording(
        streamsToRecord.filter(Boolean),
        handleRecordingTimeUpdate
      );
      
      if (success) {
        setIsRecording(true);
      }
    }
  };
EOL

# Add RecordButton to the UI
sed -i '' 's/<ScreenShareButton \n            isScreenSharing={isScreenSharing}\n            onToggleScreenShare={handleToggleScreenShare}\n          \/>/<ScreenShareButton \n            isScreenSharing={isScreenSharing}\n            onToggleScreenShare={handleToggleScreenShare}\n          \/>\n          \n          <RecordButton \n            isRecording={isRecording}\n            recordingTime={recordingTime}\n            onToggleRecording={handleToggleRecording}\n          \/>/' ./client/src/components/VideoChatRoom.jsx

# Add cleanup for recording when leaving room
sed -i '' 's/const handleLeaveRoom = () => {/const handleLeaveRoom = () => {\n    \/\/ Stop recording if active\n    if (recordingHelperRef.current && recordingHelperRef.current.isCurrentlyRecording()) {\n      recordingHelperRef.current.stopRecording().catch(console.error);\n      setIsRecording(false);\n      setRecordingTime(0);\n    }/' ./client/src/components/VideoChatRoom.jsx

echo "Updated VideoChatRoom with recording functionality!"
