import React, { useState, useEffect } from 'react';

/**
 * Login component for user registration
 * Allows users to enter a username to join the chat
 */
function Login({ onLogin, connected }) {
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset error when connection status changes
  useEffect(() => {
    if (connected) {
      setError('');
    } else {
      setError('Waiting for server connection...');
    }
  }, [connected]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Please enter a username');
      return;
    }
    
    if (!connected) {
      setError('Not connected to server. Please wait...');
      return;
    }
    
    console.log('Submitting username:', trimmedUsername);
    setIsSubmitting(true);
    setError('');
    
    try {
      onLogin(trimmedUsername);
      
      // Reset submission state after a delay
      setTimeout(() => {
        setIsSubmitting(false);
      }, 1000);
    } catch (err) {
      console.error('Error during login:', err);
      setError('Error during login. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Join Secure Voice Chat</h2>
      
      {!connected && (
        <div className="connection-warning">
          <p>Connecting to server...</p>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
      
      <form className="login-form" onSubmit={handleSubmit}>
        <label htmlFor="username">Enter your username:</label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          maxLength={32}
          autoComplete="off"
          required
          aria-label="Username"
          disabled={!connected || isSubmitting}
        />
        
        <button 
          type="submit" 
          disabled={!connected || !username.trim() || isSubmitting}
        >
          {isSubmitting ? 'Joining...' : 'Join'}
        </button>
      </form>
      
      <div className="security-info">
        <p>End-to-end encrypted • Zero persistence • Local network only</p>
      </div>
    </div>
  );
}

export default Login;
