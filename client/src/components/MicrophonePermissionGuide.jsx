import React from 'react';
import { Button } from './ui/button';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';

/**
 * Component to guide users through microphone permission issues
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.status - Microphone status object
 * @param {Function} props.onRetry - Function to call when retry button is clicked
 */
const MicrophonePermissionGuide = ({ status, onRetry }) => {
  if (!status || status.status === 'granted') {
    return null;
  }
  
  const getIcon = () => {
    switch (status.status) {
      case 'requesting':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse text-amber-500">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" x2="12" y1="19" y2="22"></line>
          </svg>
        );
      case 'denied':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" x2="12" y1="19" y2="22"></line>
            <line x1="4" y1="4" x2="20" y2="20" className="text-destructive"></line>
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" x2="12" y1="19" y2="22"></line>
          </svg>
        );
    }
  };
  
  const getAlertVariant = () => {
    switch (status.status) {
      case 'requesting':
        return 'default';
      case 'denied':
        return 'destructive';
      default:
        return 'default';
    }
  };
  
  return (
    <Alert variant={getAlertVariant()} className="mb-4">
      <div className="flex items-start">
        <div className="mr-4 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1">
          <AlertTitle>{status.message || 'Microphone Access Required'}</AlertTitle>
          <AlertDescription className="mt-2">
            {status.status === 'denied' && (
              <>
                <p className="mb-2">
                  {status.instructions || 'Please allow microphone access in your browser settings to use voice chat.'}
                </p>
                <div className="mt-3">
                  <Button onClick={onRetry} variant="outline" size="sm">
                    Try Again
                  </Button>
                </div>
              </>
            )}
            
            {status.status === 'requesting' && (
              <p>Please allow microphone access when prompted by your browser.</p>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
};

export default MicrophonePermissionGuide;
