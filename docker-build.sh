#!/bin/bash

# Docker build and run script for Image Tool

set -e

echo "🐳 Building and running Image Tool with Docker..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Build the production image
print_status "Building production Docker image..."
docker build -t image-tool:latest .

if [ $? -eq 0 ]; then
    print_success "Docker image built successfully!"
else
    print_error "Failed to build Docker image"
    exit 1
fi

# Stop and remove existing containers
print_status "Stopping existing containers..."
docker stop image-tool-app 2>/dev/null || true
docker rm image-tool-app 2>/dev/null || true

# Run the production container
print_status "Starting production container..."
docker run -d \
    --name image-tool-app \
    -p 8080:80 \
    --restart unless-stopped \
    image-tool:latest

if [ $? -eq 0 ]; then
    print_success "Container started successfully!"
    echo ""
    echo "🌐 Application is running at: http://localhost:8080"
    echo "🔍 Health check: http://localhost:8080/health"
    echo ""
    echo "📋 Container logs:"
    docker logs image-tool-app
else
    print_error "Failed to start container"
    exit 1
fi

echo ""
print_status "Docker setup complete! 🎉"
