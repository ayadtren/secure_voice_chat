#!/bin/bash
set -e

# Get local IP address
LOCAL_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1)

if [ -z "$LOCAL_IP" ]; then
  echo "Could not determine local IP address. Please check your network connection."
  exit 1
fi

echo "Detected local IP address: $LOCAL_IP"

# Update environment variables for the client
echo "REACT_APP_SERVER_URL=https://$LOCAL_IP:3001" > ./client/.env.production.local
echo "REACT_APP_WS_URL=wss://$LOCAL_IP:3001" >> ./client/.env.production.local

# Build and start the containers
echo "Building and starting Docker containers..."
docker-compose down
docker-compose build
docker-compose up -d

echo "============================================"
echo "🎉 Secure Voice Chat App Deployed! 🎉"
echo "============================================"
echo "Access the app at: http://$LOCAL_IP:3000"
echo "Share this address with friends on your local network"
echo ""
echo "To stop the app, run: docker-compose down"
echo "============================================"
