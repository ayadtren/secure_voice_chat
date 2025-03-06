import React, { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

/**
 * QR Code Scanner Component
 * 
 * Scans QR codes using device camera to facilitate easy connection between devices.
 * Includes accessibility features and responsive design.
 * 
 * @param {Object} props - Component properties
 * @param {Function} props.onScan - Callback when QR code is successfully scanned
 * @param {Function} props.onError - Optional callback when scanning encounters an error
 * @param {Function} props.onClose - Optional callback when scanner is closed
 * @param {string} props.className - Optional CSS class names
 */
const QRCodeScanner = ({ onScan, onError, onClose, className }) => {
  const [scanning, setScanning] = useState(false);
  const [html5QrCode, setHtml5QrCode] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Initialize scanner on component mount
  useEffect(() => {
    const qrCodeInstance = new Html5Qrcode('qr-reader');
    setHtml5QrCode(qrCodeInstance);

    // Get list of cameras
    Html5Qrcode.getCameras()
      .then(devices => {
        if (devices && devices.length) {
          setCameras(devices);
          setSelectedCamera(devices[0].id); // Default to first camera
        }
      })
      .catch(err => {
        console.error('Error getting cameras', err);
        if (onError) {
          onError(err);
        }
      });

    // Cleanup on unmount
    return () => {
      if (qrCodeInstance) {
        try {
          if (qrCodeInstance.isScanning) {
            qrCodeInstance.stop()
              .catch(err => console.error('Error stopping scanner on unmount', err));
          }
        } catch (error) {
          console.error('Error during QR scanner cleanup', error);
        }
      }
    };
  }, [onError]);

  const startScanner = () => {
    if (!html5QrCode || !selectedCamera) return;

    setScanning(true);
    setPermissionDenied(false);

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    html5QrCode.start(
      selectedCamera,
      config,
      (decodedText) => {
        // Handle successful scan
        try {
          let connectionData;
          
          // Try to parse as JSON if possible
          try {
            connectionData = JSON.parse(decodedText);
          } catch {
            // If not JSON, use as string
            connectionData = decodedText;
          }
          
          // Stop scanning after successful scan
          html5QrCode.stop()
            .then(() => {
              setScanning(false);
              if (onScan) {
                onScan(connectionData);
              }
            })
            .catch(err => {
              console.error('Error stopping scanner after scan', err);
              if (onError) {
                onError(err);
              }
            });
        } catch (error) {
          console.error('Error processing QR code data:', error);
          if (onError) {
            onError(error);
          }
        }
      },
      (errorMessage) => {
        // Handle scan error (mostly for debugging)
        console.log('QR Code scanning error:', errorMessage);
        // Don't call onError for every frame error
      }
    ).catch(err => {
      console.error('Error starting scanner', err);
      if (err.toString().includes('permission')) {
        setPermissionDenied(true);
      }
      setScanning(false);
      if (onError) {
        onError(err);
      }
    });
  };

  const stopScanner = () => {
    if (html5QrCode) {
      try {
        if (html5QrCode.isScanning) {
          html5QrCode.stop()
            .then(() => {
              setScanning(false);
              if (onClose) {
                onClose();
              }
            })
            .catch(err => {
              console.error('Error stopping scanner', err);
              if (onError) {
                onError(err);
              }
            });
        } else {
          setScanning(false);
          if (onClose) {
            onClose();
          }
        }
      } catch (error) {
        console.error('Error checking scanner state', error);
        setScanning(false);
        if (onError) {
          onError(error);
        }
      }
    }
  };

  const handleCameraChange = (e) => {
    setSelectedCamera(e.target.value);
    if (scanning) {
      stopScanner();
    }
  };

  return (
    <div className={cn('flex flex-col items-center p-4 bg-card rounded-lg shadow-sm', className)}>
      <div id="qr-reader" className="w-full max-w-[300px] h-[300px] bg-muted rounded-lg overflow-hidden"></div>
      
      {permissionDenied && (
        <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          Camera permission denied. Please allow camera access to scan QR codes.
        </div>
      )}
      
      {cameras.length > 1 && (
        <div className="mt-4 w-full">
          <label htmlFor="camera-select" className="block text-sm font-medium mb-1">
            Select Camera
          </label>
          <select
            id="camera-select"
            value={selectedCamera || ''}
            onChange={handleCameraChange}
            className="w-full p-2 rounded-md border border-input bg-background"
            disabled={scanning}
          >
            {cameras.map(camera => (
              <option key={camera.id} value={camera.id}>
                {camera.label || `Camera ${camera.id}`}
              </option>
            ))}
          </select>
        </div>
      )}
      
      <div className="mt-4 space-x-2">
        {!scanning ? (
          <Button 
            onClick={startScanner} 
            disabled={!selectedCamera}
            aria-label="Start scanning QR code"
          >
            Start Scanning
          </Button>
        ) : (
          <Button 
            onClick={stopScanner} 
            variant="secondary"
            aria-label="Stop scanning QR code"
          >
            Stop Scanning
          </Button>
        )}
        
        <Button 
          onClick={() => {
            stopScanner();
            if (onClose) {
              onClose();
            }
          }} 
          variant="outline"
          aria-label="Close QR scanner"
        >
          Close
        </Button>
      </div>
      
      <p className="mt-4 text-sm text-muted-foreground text-center">
        Point your camera at a Secure Voice Chat QR code to connect
      </p>
    </div>
  );
};

export default QRCodeScanner;
