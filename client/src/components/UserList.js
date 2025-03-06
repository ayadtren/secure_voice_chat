import React from 'react';

/**
 * UserList component displays all connected users
 * and allows initiating calls with them
 */
function UserList({ users, onCallUser }) {
  if (users.length === 0) {
    return (
      <div className="user-list-container">
        <h2>Available Users</h2>
        <p className="no-users-message">No other users are currently connected.</p>
        <p className="help-text">When users join, they will appear here.</p>
      </div>
    );
  }

  return (
    <div className="user-list-container">
      <h2>Available Users</h2>
      <div className="user-list">
        {users.map((user) => (
          <div key={user.id} className="user-item">
            <span className="username">{user.username}</span>
            <button 
              onClick={() => onCallUser(user)}
              aria-label={`Call ${user.username}`}
            >
              Call
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UserList;
