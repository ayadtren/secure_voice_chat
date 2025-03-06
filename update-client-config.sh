#!/bin/bash

# Script to update the client's runtime configuration in the deployed container

# Get the local IP address
LOCAL_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1)

if [ -z "$LOCAL_IP" ]; then
  echo "Error: Could not detect local IP address"
  exit 1
fi

echo "Detected local IP address: $LOCAL_IP"

# Create the configuration script content
CONFIG_CONTENT="window.APP_CONFIG = { SERVER_URL: \"http://$LOCAL_IP:3001\", WS_URL: \"ws://$LOCAL_IP:3001\" };"

# Update the configuration in the running container
docker exec voice-chat-client /bin/sh -c "sed -i \"s|window.APP_CONFIG = {.*};|$CONFIG_CONTENT|\" /usr/share/nginx/html/index.html"

echo "Updated client configuration to use server at $LOCAL_IP:3001"
