#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Secure Voice Chat - Development Script${NC}"
echo -e "${YELLOW}This script will handle the development workflow automatically${NC}"

# Kill any existing processes on port 3001
echo -e "${YELLOW}Stopping any existing server on port 3001...${NC}"
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Kill any existing ngrok processes
echo -e "${YELLOW}Stopping any existing ngrok tunnels...${NC}"
pkill -f ngrok || true

# Start ngrok in the background
echo -e "${YELLOW}Starting ngrok tunnel...${NC}"
ngrok http 3001 > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok to start and get the URL
echo -e "${YELLOW}Waiting for ngrok to start...${NC}"
sleep 3
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o "https://[a-zA-Z0-9.-]*\.ngrok-free.app")

if [ -z "$NGROK_URL" ]; then
  echo -e "${YELLOW}Failed to get ngrok URL. Checking logs...${NC}"
  cat /tmp/ngrok.log
  echo -e "${YELLOW}Killing ngrok process...${NC}"
  kill $NGROK_PID
  exit 1
fi

echo -e "${GREEN}Ngrok tunnel started at: ${NGROK_URL}${NC}"

# Update the .env file with the new ngrok URL
echo -e "${YELLOW}Updating .env file with ngrok URL...${NC}"
echo "REACT_APP_SERVER_URL=${NGROK_URL}" > ./client/.env

# Build the client
echo -e "${YELLOW}Building client application...${NC}"
cd client && npm run build
cd ..

# Start the server
echo -e "${GREEN}Starting server on port 3001...${NC}"
echo -e "${GREEN}Your application is now available at: ${NGROK_URL}${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server and cleanup${NC}"

# Trap Ctrl+C to clean up processes
trap cleanup INT
cleanup() {
  echo -e "${YELLOW}Cleaning up processes...${NC}"
  kill $NGROK_PID 2>/dev/null || true
  lsof -ti:3001 | xargs kill -9 2>/dev/null || true
  exit 0
}

# Start the server
cd server && node src/index.js
