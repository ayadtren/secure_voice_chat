import React from 'react';
import { clsx } from 'clsx';

/**
 * CameraPermissionGuide Component
 * 
 * Provides guidance for camera permissions with Radiant-TS styling
 */
const CameraPermissionGuide = ({ 
  status, 
  instructions, 
  browser, 
  onRetry,
  className = ''
}) => {
  return (
    <div className={clsx(
      className,
      'rounded-xl overflow-hidden shadow-md',
      'bg-white/15 backdrop-blur-sm',
      'border border-transparent ring-1 ring-[#D15052]/15',
      'after:absolute after:inset-0 after:rounded-xl after:shadow-[inset_0_0_2px_1px_#ffffff4d]',
      'p-6'
    )}>
      <div className="flex flex-col items-center text-center">
        {/* Status icon */}
        <div className="mb-4">
          {status === 'requesting' && (
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-amber-600">
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
            </div>
          )}
          
          {status === 'denied' && (
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-red-600">
                <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            </div>
          )}
          
          {status === 'granted' && (
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-green-600">
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
            </div>
          )}
          
          {status === 'unavailable' && (
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-gray-600">
                <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            </div>
          )}
        </div>
        
        {/* Title based on status */}
        <h3 className="text-lg font-medium mb-2">
          {status === 'requesting' && 'Camera Access Required'}
          {status === 'denied' && 'Camera Access Denied'}
          {status === 'granted' && 'Camera Access Granted'}
          {status === 'unavailable' && 'Camera Unavailable'}
        </h3>
        
        {/* Instructions */}
        <p className="text-gray-700 mb-4">
          {instructions}
        </p>
        
        {/* Browser-specific note */}
        {browser && (
          <div className="text-sm text-gray-500 mb-4">
            Detected browser: {browser}
          </div>
        )}
        
        {/* Retry button for denied status */}
        {status === 'denied' && onRetry && (
          <button
            onClick={onRetry}
            className={clsx(
              'inline-flex items-center justify-center px-4 py-[calc(--spacing(2)-1px)]',
              'rounded-full border border-transparent bg-gray-950 shadow-md',
              'text-base font-medium whitespace-nowrap text-white',
              'data-hover:bg-gray-800'
            )}
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default CameraPermissionGuide;
