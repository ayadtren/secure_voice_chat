import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode.react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

/**
 * QR Code Generator Component
 * 
 * Generates a QR code for easy connection between devices on the local network.
 * Includes accessibility features and responsive design.
 * 
 * @param {Object} props - Component properties
 * @param {string} props.connectionData - Data to encode in the QR code (typically room ID or connection details)
 * @param {string} props.className - Optional CSS class names
 * @param {Function} props.onDownload - Optional callback when QR code is downloaded
 */
const QRCodeGenerator = ({ connectionData, className, onDownload }) => {
  const [qrValue, setQrValue] = useState('');
  
  useEffect(() => {
    // Format the connection data for QR code
    // This could be a JSON string with room ID and any other necessary connection details
    if (connectionData) {
      try {
        const formattedData = typeof connectionData === 'string' 
          ? connectionData 
          : JSON.stringify(connectionData);
        setQrValue(formattedData);
      } catch (error) {
        console.error('Error formatting QR code data:', error);
        setQrValue('');
      }
    }
  }, [connectionData]);

  // Handle QR code download
  const handleDownload = () => {
    const canvas = document.getElementById('connection-qrcode');
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'secure-voice-chat-qrcode.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      if (onDownload) {
        onDownload();
      }
    }
  };

  if (!qrValue) {
    return null;
  }

  return (
    <div className={cn('flex flex-col items-center p-4 bg-card rounded-lg shadow-sm', className)}>
      <div className="mb-4 p-4 bg-white rounded-lg">
        <QRCode
          id="connection-qrcode"
          value={qrValue}
          size={200}
          level="H" // High error correction for better scanning
          includeMargin={true}
          renderAs="canvas"
          aria-label="QR code for secure connection"
        />
      </div>
      
      <div className="space-y-2 w-full">
        <Button 
          onClick={handleDownload}
          variant="outline"
          className="w-full"
          aria-label="Download QR code"
        >
          Download QR Code
        </Button>
        
        <p className="text-sm text-muted-foreground text-center">
          Scan this code with another device to connect securely
        </p>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
