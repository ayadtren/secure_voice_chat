import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { isMobileDevice } from '../lib/utils';

/**
 * Login component for user authentication
 * 
 * @param {Object} props - Component properties
 * @param {Function} props.onLogin - Function to call when login form is submitted
 * @param {boolean} props.connected - Whether connected to server
 */
const Login = ({ onLogin, connected = false }) => {
  const [username, setUsername] = useState('');
  const [showMicInfo, setShowMicInfo] = useState(false);
  
  // Check if the browser supports getUserMedia
  useEffect(() => {
    const checkMicrophoneSupport = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setShowMicInfo(true);
      }
    };
    
    checkMicrophoneSupport();
  }, []);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim() && connected) {
      onLogin(username.trim());
    }
  };
  
  return (
    <div className="login-container">
      <h2>Join Secure Voice Chat</h2>
      
      {showMicInfo && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Microphone Access Required</AlertTitle>
          <AlertDescription>
            This browser may not fully support microphone access. For the best experience, 
            please use a modern browser like Chrome, Firefox, or Safari.
          </AlertDescription>
        </Alert>
      )}
      
      <form className="login-form" onSubmit={handleSubmit}>
        <label htmlFor="username">Enter your username:</label>
        <input
          type="text"
          id="username"
          placeholder="Username"
          maxLength={32}
          autoComplete="off"
          required
          aria-label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4A72F5] bg-white text-gray-900"
        />
        
        <Button 
          type="submit" 
          disabled={!connected || !username.trim()}
          className="w-full mt-4"
        >
          {connected ? 'Join' : 'Connecting...'}
        </Button>
      </form>
      
      <div className="microphone-info mt-6 text-sm">
        <h3 className="font-medium mb-2">Before you join:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>This app requires microphone access for voice chat</li>
          <li>You'll be prompted to allow microphone access after joining</li>
          <li>All audio is end-to-end encrypted</li>
          <li>No audio is stored or recorded</li>
        </ul>
      </div>
      
      <div className="security-info mt-6 text-xs text-center text-gray-500">
        <p>End-to-end encrypted • Zero persistence • Local network only</p>
      </div>
    </div>
  );
};

export default Login;
