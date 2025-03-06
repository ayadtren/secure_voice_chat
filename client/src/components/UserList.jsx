import React from 'react';
import { Button } from './ui/button';

/**
 * User List component
 * Displays a list of online users and provides call functionality
 * 
 * @param {Object} props - Component properties
 * @param {Array} props.users - List of online users
 * @param {Function} props.onCallUser - Function to call when user is clicked
 * @param {Object} props.currentCall - Current call information
 * @param {string} props.callStatus - Current call status
 */
const UserList = ({ users = [], onCallUser, currentCall, callStatus = 'idle' }) => {
  if (!users || users.length === 0) {
    return (
      <div className="user-list-empty">
        <p className="text-sm text-gray-500 dark:text-gray-400">No users online</p>
      </div>
    );
  }

  return (
    <div className="user-list">
      <ul className="space-y-2">
        {users.map(user => (
          <li 
            key={user.id} 
            className={`
              flex items-center justify-between p-2 rounded-md
              ${currentCall && currentCall.id === user.id ? 'bg-primary/10' : 'hover:bg-secondary/50'}
            `}
          >
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
              <span>{user.username}</span>
            </div>
            
            {(!currentCall || currentCall.id !== user.id) && callStatus === 'idle' && (
              <Button 
                onClick={() => onCallUser(user)}
                size="sm"
                variant="outline"
                className="ml-2"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="mr-1"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                Call
              </Button>
            )}
            
            {currentCall && currentCall.id === user.id && (
              <span className="text-xs px-2 py-1 rounded-full bg-primary text-primary-foreground">
                {callStatus === 'calling' ? 'Calling...' : 'In Call'}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserList;
