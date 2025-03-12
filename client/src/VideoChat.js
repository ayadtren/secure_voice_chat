import React, { useState } from 'react';
import VideoChatRoom from './components/VideoChatRoom';
import { Button } from './components/ui/button';
import { clsx } from 'clsx';

/**
 * VideoChat Component
 * 
 * Main entry point for the video chat functionality.
 * Allows users to join a video chat room or create a new one.
 */
const VideoChat = ({ username, onBack }) => {
  const [roomId, setRoomId] = useState('');
  const [inRoom, setInRoom] = useState(false);
  const [error, setError] = useState(null);

  // Join a room
  const handleJoinRoom = () => {
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }
    
    setInRoom(true);
    setError(null);
  };

  // Create a new room with a random ID
  const handleCreateRoom = () => {
    const newRoomId = `room-${Math.random().toString(36).substring(2, 9)}`;
    setRoomId(newRoomId);
    setInRoom(true);
    setError(null);
  };

  // Leave the current room
  const handleLeaveRoom = () => {
    setInRoom(false);
  };

  return (
    <div className="flex flex-col h-full">
      {inRoom ? (
        <VideoChatRoom 
          roomId={roomId}
          userId={username}
          onLeave={handleLeaveRoom}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-gradient-to-b from-white to-gray-50">
          <div className="w-full max-w-md p-6 bg-white rounded-xl shadow-md">
            <h1 className="text-2xl font-bold text-center mb-6">Video Chat</h1>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="mb-6">
              <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-1">
                Room ID
              </label>
              <input
                type="text"
                id="roomId"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter a room ID to join"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A72F5] bg-white text-gray-900"
              />
            </div>
            
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleJoinRoom}
                className={clsx(
                  'inline-flex items-center justify-center px-4 py-2',
                  'rounded-full border border-transparent bg-[#4A72F5] shadow-md',
                  'text-base font-medium whitespace-nowrap text-white',
                  'hover:bg-opacity-90 transition-colors'
                )}
              >
                Join Room
              </button>
              
              <button
                onClick={handleCreateRoom}
                className={clsx(
                  'inline-flex items-center justify-center px-4 py-2',
                  'rounded-full border border-gray-700 bg-gray-800 shadow-md',
                  'text-base font-medium whitespace-nowrap text-white',
                  'hover:bg-gray-700 transition-colors'
                )}
              >
                Create New Room
              </button>
              
              <button
                onClick={onBack}
                className={clsx(
                  'inline-flex items-center justify-center px-4 py-2',
                  'rounded-lg border border-gray-300 bg-white shadow-sm',
                  'text-sm font-medium whitespace-nowrap text-gray-800',
                  'hover:bg-gray-50 transition-colors'
                )}
              >
                Back to Voice Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoChat;
