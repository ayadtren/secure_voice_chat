#!/bin/bash
set -e

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Secure Voice Chat - Simple Deployment Script${NC}"

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first:${NC}"
    echo -e "  Visit: ${YELLOW}https://docs.docker.com/get-docker/${NC}"
    exit 1
fi

# Check for Docker Compose (either standalone or plugin)
DOCKER_COMPOSE_CMD=""
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
    echo -e "${GREEN}Using standalone docker-compose command${NC}"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
    echo -e "${GREEN}Using Docker Compose plugin${NC}"
else
    echo -e "${YELLOW}Docker Compose not found. Installing Docker Compose...${NC}"
    
    # For macOS, use Homebrew if available
    if command -v brew &> /dev/null; then
        echo -e "${YELLOW}Installing Docker Compose using Homebrew...${NC}"
        brew install docker-compose
        if [ $? -eq 0 ]; then
            DOCKER_COMPOSE_CMD="docker-compose"
            echo -e "${GREEN}Docker Compose installed successfully${NC}"
        else
            echo -e "${RED}Failed to install Docker Compose with Homebrew${NC}"
            exit 1
        fi
    else
        echo -e "${RED}Docker Compose is required but not found.${NC}"
        echo -e "${YELLOW}Please install Docker Compose:${NC}"
        echo -e "  macOS: ${YELLOW}brew install docker-compose${NC}"
        echo -e "  Or visit: ${YELLOW}https://docs.docker.com/compose/install/${NC}"
        exit 1
    fi
fi

# Get local IP address
echo -e "${YELLOW}Detecting local IP address...${NC}"
LOCAL_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1)

if [ -z "$LOCAL_IP" ]; then
  echo -e "${RED}Could not determine local IP address.${NC}"
  echo -e "${YELLOW}Please check your network connection.${NC}"
  exit 1
fi

echo -e "${GREEN}Detected local IP address: ${LOCAL_IP}${NC}"

# Update environment variables for the client
echo -e "${YELLOW}Updating client environment variables...${NC}"
cat > ./client/.env << EOF
REACT_APP_SERVER_URL=http://${LOCAL_IP}:3001
REACT_APP_WS_URL=ws://${LOCAL_IP}:3001
EOF

# Update server environment variables
echo -e "${YELLOW}Updating server environment variables...${NC}"
cat > ./server/.env << EOF
NODE_ENV=development
PORT=3001
USE_HTTPS=false
EOF

# Build and start the containers
echo -e "${YELLOW}Building and starting Docker containers...${NC}"
$DOCKER_COMPOSE_CMD down || true
$DOCKER_COMPOSE_CMD up -d --build

# Wait for containers to start
echo -e "${YELLOW}Waiting for containers to start...${NC}"
sleep 5

# Update client configuration in the running container
echo -e "${YELLOW}Updating client runtime configuration...${NC}"
CONFIG_CONTENT="window.APP_CONFIG = { SERVER_URL: \"http://$LOCAL_IP:3001\", WS_URL: \"ws://$LOCAL_IP:3001\" };"
docker exec voice-chat-client /bin/sh -c "sed -i \"s|window.APP_CONFIG = {.*};|$CONFIG_CONTENT|\" /usr/share/nginx/html/index.html"

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}🎉 Secure Voice Chat App Deployed! 🎉${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Access the app at: http://${LOCAL_IP}:3000${NC}"
echo -e "${GREEN}Share this address with friends on your local network${NC}"
echo -e ""
echo -e "${YELLOW}To stop the app, run: ${DOCKER_COMPOSE_CMD} down${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e ""
echo -e "${YELLOW}Note: For friends outside your network, you can:${NC}"
echo -e "  1. Set up port forwarding on your router (ports 3000 and 3001)"
echo -e "  2. Use a VPN solution like ZeroTier (https://www.zerotier.com)"
echo -e "  3. Use ngrok for temporary access (see dev.sh script)"
