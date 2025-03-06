# Secure Voice Chat App Deployment Guide

This guide provides multiple options for deploying your secure voice chat app for testing with friends, prioritizing privacy, security, and ease of deployment.

## Option 1: Local Network Deployment (Recommended for Privacy)

This method keeps everything on your local network, maximizing privacy and security.

### Prerequisites
- Docker and Docker Compose installed
- All devices must be on the same local network

### Deployment Steps

1. Run the deployment script:
   ```bash
   ./deploy-local.sh
   ```

2. The script will:
   - Detect your local IP address
   - Configure the client to connect to the server
   - Build and start Docker containers
   - Display the URL to access the app

3. Share the displayed URL with friends on your local network

4. To stop the app:
   ```bash
   docker-compose down
   ```

## Option 2: Tailscale VPN Deployment (Recommended for Remote Testing)

This method allows testing with friends who are not on your local network while maintaining privacy.

### Prerequisites
- Docker and Docker Compose installed
- [Tailscale](https://tailscale.com/) installed on your machine and your friends' devices

### Deployment Steps

1. Install Tailscale on your machine and your friends' devices
   ```bash
   # macOS
   brew install tailscale
   
   # Ubuntu/Debian
   curl -fsSL https://tailscale.com/install.sh | sh
   ```

2. Start Tailscale on your machine
   ```bash
   tailscale up
   ```

3. Get your Tailscale IP address
   ```bash
   tailscale ip -4
   ```

4. Update the client environment variables
   ```bash
   echo "REACT_APP_SERVER_URL=https://<YOUR_TAILSCALE_IP>:3001" > ./client/.env.production.local
   echo "REACT_APP_WS_URL=wss://<YOUR_TAILSCALE_IP>:3001" >> ./client/.env.production.local
   ```

5. Build and start the Docker containers
   ```bash
   docker-compose down
   docker-compose build
   docker-compose up -d
   ```

6. Share your Tailscale IP with your friends (e.g., http://<YOUR_TAILSCALE_IP>:3000)

## Option 3: Cloud Deployment with Fly.io (Simple Public Deployment)

This method deploys your app to the public internet using Fly.io's free tier.

### Prerequisites
- [Fly.io CLI](https://fly.io/docs/hands-on/install-flyctl/) installed
- Fly.io account (free tier available)

### Deployment Steps

1. Install the Fly.io CLI
   ```bash
   # macOS
   brew install flyctl
   ```

2. Login to Fly.io
   ```bash
   fly auth login
   ```

3. Create a `fly.toml` file in the project root
   ```bash
   fly launch
   ```
   Follow the prompts to configure your app.

4. Deploy the app
   ```bash
   fly deploy
   ```

5. Share the provided URL with your friends

## Troubleshooting

### WebRTC Connection Issues
- Ensure all devices are properly connected to the same network (for local deployment)
- Check that your firewall isn't blocking WebRTC connections
- For remote testing, Tailscale VPN is recommended as it handles NAT traversal

### Certificate Warnings
- The app uses self-signed certificates for HTTPS
- You may need to accept security warnings in your browser
- This is expected and doesn't affect the end-to-end encryption of WebRTC

### Docker Issues
- If containers fail to start, check logs with `docker-compose logs`
- Ensure ports 3000 and 3001 are not already in use on your machine

## Security Considerations

- **Local Network Deployment**: Most secure and private option
- **Tailscale VPN**: Excellent security with end-to-end encryption
- **Cloud Deployment**: Convenient but exposes your app to the public internet

Remember that regardless of deployment method, your voice chat remains end-to-end encrypted through WebRTC's DTLS-SRTP protocol.
