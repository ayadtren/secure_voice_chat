import React from 'react';

/**
 * Connection Status component
 * Displays the current connection status with the server
 * 
 * @param {Object} props - Component properties
 * @param {boolean} props.connected - Whether connected to server
 */
const ConnectionStatus = ({ connected = false }) => {
  return (
    <div className="connection-status flex items-center">
      <div 
        className={`status-indicator w-3 h-3 rounded-full mr-2 ${
          connected ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      <span className="text-sm">
        {connected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
};

export default ConnectionStatus;
