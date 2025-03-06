FROM node:18-alpine as build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies with legacy peer deps to handle React version conflicts
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Create .env file at build time using ARG
ARG REACT_APP_SERVER_URL
ARG REACT_APP_WS_URL
ENV REACT_APP_SERVER_URL=${REACT_APP_SERVER_URL}
ENV REACT_APP_WS_URL=${REACT_APP_WS_URL}

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy build files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
