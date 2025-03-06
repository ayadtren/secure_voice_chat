import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import UserList from './components/UserList';
import AudioControls from './components/AudioControls';
import ConnectionStatus from './components/ConnectionStatus';
import Login from './components/Login';
import { WebRTCManager } from './utils/webrtcManager';
import QRCodeGenerator from './components/QRCodeGenerator';
import QRCodeScanner from './components/QRCodeScanner';
import MicrophonePermissionGuide from './components/MicrophonePermissionGuide';
import { Button } from './components/ui/button';

// Configuration - prioritize runtime config over environment variables
const SERVER_URL = window.APP_CONFIG?.SERVER_URL || process.env.REACT_APP_SERVER_URL;
const WS_URL = window.APP_CONFIG?.WS_URL || process.env.REACT_APP_WS_URL;

console.log('Using server URL:', SERVER_URL);
console.log('Using WebSocket URL:', WS_URL);

function App() {
  // State
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState('');
  const [users, setUsers] = useState([]);
  const [currentCall, setCurrentCall] = useState(null);
  const [callStatus, setCallStatus] = useState('idle'); // idle, calling, connected
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [networkQuality, setNetworkQuality] = useState(100); // 0-100
  const [darkMode, setDarkMode] = useState(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [showQRCode, setShowQRCode] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [peerSpeaking, setPeerSpeaking] = useState(false);
  const [webrtcManager, setWebrtcManager] = useState(null);
  const [microphoneStatus, setMicrophoneStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Refs
  const localStream = useRef(null);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  
  // Cleanup local audio stream
  const cleanupLocalStream = () => {
    if (localStream.current) {
      const tracks = localStream.current.getTracks();
      tracks.forEach(track => track.stop());
      localStream.current = null;
    }
    
    if (localAudioRef.current) {
      localAudioRef.current.srcObject = null;
    }
  };
  
  // Handle call end (cleanup)
  const handleCallEnd = useCallback(() => {
    if (webrtcManager) {
      webrtcManager.dispose();
      setWebrtcManager(null);
    }
    
    cleanupLocalStream();
    
    setCurrentCall(null);
    setCallStatus('idle');
    setNetworkQuality(100);
    setIsSpeaking(false);
    setPeerSpeaking(false);
  }, [webrtcManager]);
  
  // Initialize WebRTC manager
  const initializeWebRTC = useCallback(async (socketInstance) => {
    try {
      const manager = new WebRTCManager(socketInstance, {
        userId: socketInstance.id,
        onPeerConnect: (peerId, stream) => {
          if (remoteAudioRef.current && stream) {
            remoteAudioRef.current.srcObject = stream;
          }
          setCallStatus('connected');
        },
        onPeerDisconnect: (peerId) => {
          setCallStatus('idle');
          setCurrentCall(null);
          setPeerSpeaking(false);
        },
        onSpeakingChange: (speaking) => {
          setIsSpeaking(speaking);
        },
        onAudioQualityChange: (quality) => {
          setNetworkQuality(quality.overall);
        },
        onError: (error) => {
          console.error('WebRTC error:', error);
          setErrorMessage(error);
          setTimeout(() => setErrorMessage(null), 5000);
        },
        onMicrophoneStatus: (status) => {
          console.log('Microphone status:', status);
          setMicrophoneStatus(status);
        }
      });
      
      await manager.initialize('lobby');
      setWebrtcManager(manager);
      return manager;
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      return null;
    }
  }, []);
  
  // Handle socket events
  useEffect(() => {
    if (!WS_URL) {
      console.error('WebSocket URL is not defined');
      return;
    }
    
    console.log('Connecting to WebSocket server at:', WS_URL);
    const newSocket = io(WS_URL, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling']
    });
    
    setSocket(newSocket);
    
    // Connection events
    newSocket.on('connect', () => {
      console.log('Connected to server with ID:', newSocket.id);
      setConnected(true);
      
      // Initialize WebRTC after connection
      initializeWebRTC(newSocket).catch(error => {
        console.error('Error initializing WebRTC:', error);
      });
    });
    
    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
      handleCallEnd();
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnected(false);
    });
    
    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      alert(`Error: ${error.message}`);
    });
    
    newSocket.on('userList', (userList) => {
      setUsers(userList.filter(user => user.id !== newSocket.id));
    });
    
    newSocket.on('registered', (data) => {
      console.log('Successfully registered as:', data.username);
      setUsername(data.username);
    });
    
    // WebRTC signaling events
    newSocket.on('offer', async ({ from, offer }) => {
      console.log('Received offer from:', from);
      
      // If already in a call, reject
      if (callStatus !== 'idle') {
        newSocket.emit('busy', { target: from });
        return;
      }
      
      // Get caller info
      const caller = users.find(user => user.id === from);
      if (!caller) return;
      
      // Ask user to accept call
      const accept = window.confirm(`Incoming call from ${caller.username}. Accept?`);
      if (!accept) {
        newSocket.emit('reject', { target: from });
        return;
      }
      
      try {
        // Accept call using existing WebRTC manager
        if (!webrtcManager) {
          throw new Error('WebRTC not initialized');
        }
        
        await webrtcManager.acceptIncomingCall(from, offer);
        setCurrentCall(caller);
        setCallStatus('connected');
      } catch (error) {
        console.error('Error accepting call:', error);
        newSocket.emit('error', { target: from, message: 'Failed to accept call' });
      }
    });
    
    newSocket.on('answer', async ({ from, answer }) => {
      console.log('Received answer from:', from);
      
      if (!webrtcManager || callStatus !== 'calling') return;
      
      try {
        await webrtcManager.handleAnswer(from, answer);
        console.log('Remote description set successfully');
        setCallStatus('connected');
      } catch (error) {
        console.error('Error setting remote description:', error);
        handleCallEnd();
      }
    });
    
    newSocket.on('iceCandidate', async ({ from, candidate }) => {
      console.log('Received ICE candidate from:', from);
      
      if (!webrtcManager) return;
      
      try {
        await webrtcManager.addIceCandidate(from, candidate);
        console.log('Added ICE candidate successfully');
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    });
    
    newSocket.on('speaking', ({ userId, speaking }) => {
      if (currentCall && userId === currentCall.id) {
        setPeerSpeaking(speaking);
      }
    });
    
    newSocket.on('reject', () => {
      alert('Call was rejected');
      handleCallEnd();
    });
    
    newSocket.on('busy', () => {
      alert('User is busy');
      handleCallEnd();
    });
    
    newSocket.on('callEnded', () => {
      alert('Call ended by the other user');
      handleCallEnd();
    });
    
    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
      cleanupLocalStream();
      if (webrtcManager) {
        webrtcManager.dispose();
      }
    };
  }, [callStatus, currentCall, handleCallEnd, users, initializeWebRTC, webrtcManager]);
  
  // Handle dark mode preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setDarkMode(e.matches);
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  // Apply dark mode class to body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);
  
  // Handle user registration
  const handleLogin = async (username) => {
    if (!socket || !connected) {
      console.error('Not connected to server');
      alert('Not connected to server. Please try again.');
      return;
    }
    
    console.log('Attempting to register with username:', username);
    
    // Add event listeners for registration response
    const onRegistered = (data) => {
      console.log('Successfully registered as:', data.username);
      setUsername(data.username);
      socket.off('registered', onRegistered);
      socket.off('error', onError);
    };
    
    const onError = (error) => {
      console.error('Registration error:', error);
      alert(`Registration error: ${error.message}`);
      socket.off('registered', onRegistered);
      socket.off('error', onError);
    };
    
    // Listen for the response
    socket.on('registered', onRegistered);
    socket.on('error', onError);
    
    // Send registration request
    socket.emit('register', { username });
  };
  
  // Start a call with a user
  const startCall = async (targetUser) => {
    if (callStatus !== 'idle') return;
    
    try {
      // Create new WebRTC manager
      const manager = new WebRTCManager(socket, {
        userId: socket.id,
        onPeerConnect: (peerId, stream) => {
          if (remoteAudioRef.current && stream) {
            remoteAudioRef.current.srcObject = stream;
          }
          setCallStatus('connected');
        },
        onPeerDisconnect: () => {
          handleCallEnd();
        },
        onSpeakingChange: (speaking) => {
          setIsSpeaking(speaking);
        },
        onAudioQualityChange: (peerId, quality) => {
          setNetworkQuality(Math.round(quality));
        },
        onError: (error) => {
          console.error('WebRTC error:', error);
          alert(`WebRTC error: ${error}`);
        }
      });
      
      setWebrtcManager(manager);
      
      // Initialize and start the call
      await manager.initialize(targetUser.id);
      await manager.startCall(targetUser.id);
      
      setCurrentCall(targetUser);
      setCallStatus('calling');
      
    } catch (error) {
      console.error('Error starting call:', error);
      alert('Failed to start call. Please try again.');
      handleCallEnd();
    }
  };
  
  // End the current call
  const endCall = () => {
    if (!socket || !currentCall) return;
    
    socket.emit('callEnded', { target: currentCall.id });
    handleCallEnd();
  };
  
  // Toggle microphone
  const toggleMicrophone = () => {
    if (webrtcManager) {
      const enabled = webrtcManager.toggleMicrophone();
      setAudioEnabled(enabled);
    } else if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };
  
  // Handle QR code scan result
  const handleQRScan = (data) => {
    try {
      const connectionData = JSON.parse(data);
      if (connectionData.roomId && connectionData.userId) {
        // Start call with scanned user
        const user = {
          id: connectionData.userId,
          username: connectionData.username || 'User via QR'
        };
        startCall(user);
        setShowQRScanner(false);
      }
    } catch (error) {
      console.error('Invalid QR code data:', error);
      alert('Invalid QR code. Please try again.');
    }
  };
  
  // Generate QR code data
  const getQRCodeData = () => {
    return JSON.stringify({
      roomId: socket?.id,
      userId: socket?.id,
      username: username
    });
  };
  
  // Handle retry for microphone permissions
  const handleRetryMicrophoneAccess = useCallback(async () => {
    setMicrophoneStatus({ status: 'requesting', message: 'Requesting microphone access...' });
    
    try {
      if (webrtcManager) {
        // Use the dedicated retry method instead of reinitializing
        const success = await webrtcManager.retryMicrophoneAccess();
        
        if (!success) {
          console.error('Failed to get microphone access after retry');
        }
      } else if (socket) {
        // If no webrtcManager exists yet, create a new one
        await initializeWebRTC(socket);
      }
    } catch (error) {
      console.error('Error retrying microphone access:', error);
    }
  }, [socket, webrtcManager, initializeWebRTC]);
  
  return (
    <div className={`app ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <header className="app-header">
        <h1>Secure Voice Chat</h1>
        <button 
          className="theme-toggle" 
          onClick={toggleDarkMode} 
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </header>
      
      <main className="app-content">
        {errorMessage && (
          <div className="error-message">
            <p>{errorMessage}</p>
            <button onClick={() => setErrorMessage(null)}>✕</button>
          </div>
        )}
        
        {!username ? (
          <Login onLogin={handleLogin} connected={connected} />
        ) : (
          <div className="chat-container">
            <div className="sidebar">
              <div className="user-info">
                <h3>Your Profile</h3>
                <p>Username: {username}</p>
                <p>Status: {connected ? 'Connected' : 'Disconnected'}</p>
                <ConnectionStatus connected={connected} />
              </div>
              
              <div className="user-list-container">
                <h3>Online Users</h3>
                <UserList 
                  users={users} 
                  onCallUser={startCall} 
                  currentCall={currentCall}
                  callStatus={callStatus}
                />
              </div>
              
              <div className="qr-options">
                <Button 
                  onClick={() => {
                    setShowQRCode(!showQRCode);
                    setShowQRScanner(false);
                  }}
                  variant={showQRCode ? "secondary" : "default"}
                >
                  {showQRCode ? 'Hide QR Code' : 'Show My QR Code'}
                </Button>
                
                <Button 
                  onClick={() => {
                    setShowQRScanner(!showQRScanner);
                    setShowQRCode(false);
                  }}
                  variant={showQRScanner ? "secondary" : "default"}
                >
                  {showQRScanner ? 'Hide Scanner' : 'Scan QR Code'}
                </Button>
              </div>
            </div>
            
            <div className="content">
              <MicrophonePermissionGuide 
                status={microphoneStatus} 
                onRetry={handleRetryMicrophoneAccess} 
              />
              
              <div className="call-status-container">
                {callStatus === 'idle' ? (
                  <div className="idle-container">
                    <h2>Not in a call</h2>
                    <p>Select a user from the list to start a call</p>
                    
                    {showQRCode && (
                      <div className="qr-container">
                        <QRCodeGenerator 
                          data={{
                            userId: socket?.id,
                            username,
                            roomId: 'lobby'
                          }}
                        />
                      </div>
                    )}
                    
                    {showQRScanner && (
                      <div className="qr-container">
                        <QRCodeScanner 
                          onScan={handleQRScan}
                          onError={(error) => console.error('QR scan error:', error)}
                          onClose={() => setShowQRScanner(false)}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="call-container">
                    <h2>
                      {callStatus === 'calling' 
                        ? `Calling ${currentCall?.username}...` 
                        : `In call with ${currentCall?.username}`}
                    </h2>
                    
                    <div className="speaking-indicators">
                      <div className={`indicator ${isSpeaking ? 'speaking' : ''}`}>
                        You {isSpeaking ? '(Speaking)' : ''}
                      </div>
                      <div className={`indicator ${peerSpeaking ? 'speaking' : ''}`}>
                        {currentCall?.username} {peerSpeaking ? '(Speaking)' : ''}
                      </div>
                    </div>
                    
                    <div className="call-actions">
                      <AudioControls 
                        muted={!audioEnabled}
                        onToggleMute={toggleMicrophone}
                        onHangup={endCall}
                        quality={networkQuality}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Audio elements */}
        <audio ref={localAudioRef} autoPlay muted></audio>
        <audio ref={remoteAudioRef} autoPlay></audio>
      </main>
      
      <footer className="app-footer">
        <p>Secure Voice Chat &copy; 2025 - End-to-End Encrypted | Zero Persistence | Privacy First</p>
      </footer>
    </div>
  );
}

export default App;
