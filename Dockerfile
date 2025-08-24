# Multi-stage build for React application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install necessary build tools for native modules
RUN apk add --no-cache python3 make g++ libc6-compat

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies with legacy peer deps flag
RUN yarn install --frozen-lockfile --network-timeout 1000000

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Production stage with nginx
FROM nginx:alpine AS production

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
