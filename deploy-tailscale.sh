#!/bin/bash
set -e

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Secure Voice Chat - Tailscale Deployment Script${NC}"

# Check if Tailscale is installed
if ! command -v tailscale &> /dev/null; then
    echo -e "${RED}Tailscale is not installed. Please install it first:${NC}"
    echo -e "  macOS: ${YELLOW}brew install tailscale${NC}"
    echo -e "  Linux: ${YELLOW}curl -fsSL https://tailscale.com/install.sh | sh${NC}"
    exit 1
fi

# Check if Tailscale daemon is running
if ! tailscale status &> /dev/null; then
    echo -e "${YELLOW}Tailscale daemon is not running. Starting Tailscale daemon...${NC}"
    
    # For macOS, try to start the service
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "${YELLOW}Attempting to start Tailscale service on macOS...${NC}"
        sudo launchctl start com.tailscale.tailscaled || true
        sleep 2
    fi
    
    # Check again if the daemon is running
    if ! tailscale status &> /dev/null; then
        echo -e "${RED}Could not start Tailscale daemon automatically.${NC}"
        echo -e "${YELLOW}Please start Tailscale manually:${NC}"
        echo -e "  1. Open the Tailscale application"
        echo -e "  2. Sign in to your Tailscale account"
        echo -e "  3. Run this script again once Tailscale is running"
        exit 1
    fi
fi

# Check if logged in to Tailscale
TAILSCALE_STATUS=$(tailscale status 2>&1)
if [[ $TAILSCALE_STATUS == *"not logged in"* ]] || [[ $TAILSCALE_STATUS == *"failed to connect"* ]]; then
    echo -e "${YELLOW}You are not logged in to Tailscale. Attempting to log in...${NC}"
    echo -e "${YELLOW}A browser window may open for authentication.${NC}"
    
    # Try to log in
    tailscale up
    
    # Check if login was successful
    if ! tailscale status &> /dev/null; then
        echo -e "${RED}Failed to log in to Tailscale.${NC}"
        echo -e "${YELLOW}Please log in manually and run this script again.${NC}"
        exit 1
    fi
fi

# Get Tailscale IP address
echo -e "${YELLOW}Getting Tailscale IP address...${NC}"
TAILSCALE_IP=$(tailscale ip -4)

if [ -z "$TAILSCALE_IP" ]; then
    echo -e "${RED}Could not determine Tailscale IP address.${NC}"
    echo -e "${YELLOW}Please check your Tailscale connection and run this script again.${NC}"
    exit 1
fi

echo -e "${GREEN}Detected Tailscale IP address: ${TAILSCALE_IP}${NC}"

# Update environment variables for the client
echo -e "${YELLOW}Updating client environment variables...${NC}"
echo "REACT_APP_SERVER_URL=https://$TAILSCALE_IP:3001" > ./client/.env.production.local
echo "REACT_APP_WS_URL=wss://$TAILSCALE_IP:3001" >> ./client/.env.production.local

# Build and start the containers
echo -e "${YELLOW}Building and starting Docker containers...${NC}"
docker-compose down
docker-compose build
docker-compose up -d

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}🎉 Secure Voice Chat App Deployed with Tailscale! 🎉${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Access the app at: http://${TAILSCALE_IP}:3000${NC}"
echo -e "${GREEN}Share this address with friends who have Tailscale installed${NC}"
echo -e ""
echo -e "${YELLOW}To stop the app, run: docker-compose down${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e ""
echo -e "${YELLOW}Note: Make sure your friends:${NC}"
echo -e "  1. Have Tailscale installed"
echo -e "  2. Are connected to your Tailscale network"
echo -e "  3. Have accepted your Tailscale sharing settings"
